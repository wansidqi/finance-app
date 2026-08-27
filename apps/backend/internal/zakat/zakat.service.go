package zakat

import (
	asset "go-fiber-app/internal/assets"
	"go-fiber-app/pkg/db"
	"go-fiber-app/pkg/hijri"
	"go-fiber-app/pkg/nisab"
	"strings"
	"time"
)

type Service struct{}

func ZakatService() *Service {
	return &Service{}
}

const (
	zakatRate = 0.025

	// dueWindowDays is how many days before the haul completes that status
	// switches from PENDING to DUE, giving an early reminder.
	dueWindowDays = 7
)

type categoryTotal struct {
	value     float64
	platforms map[string]float64
}

func (s *Service) GetAllCategories() (*[]TrackerDto, error) {
	// 1️⃣ Get assets and aggregate values by category + platform
	assets, err := asset.AssetService().GetAllAssets()
	if err != nil {
		return nil, err
	}

	categories := map[string]*categoryTotal{}
	for _, a := range assets {
		if !a.IsCalculate || a.Price == nil {
			continue
		}

		agg, ok := categories[a.Category]
		if !ok {
			agg = &categoryTotal{platforms: map[string]float64{}}
			categories[a.Category] = agg
		}

		platform := "Unspecified"
		if a.Platform != nil && *a.Platform != "" {
			platform = *a.Platform
		}

		agg.value += *a.Price
		agg.platforms[platform] += *a.Price
	}

	// 2️⃣ Get active trackers
	trackers, err := s.GetAllTrackers()
	if err != nil {
		return nil, err
	}

	// 3️⃣ Index trackers by category
	trackerMap := map[string]ZakatTracker{}
	for _, tracker := range *trackers {
		trackerMap[tracker.Category] = tracker
	}

	// 4️⃣ Build DTOs (loop categories, not trackers)
	now := time.Now()
	currentNisab := nisab.Value()
	var trackerDtos []TrackerDto

	for category, agg := range categories {
		value := agg.value
		nisabReached := value >= currentNisab

		var zakatDue float64
		if nisabReached {
			zakatDue = value * zakatRate
		}

		breakdown := make([]PlatformShareDto, 0, len(agg.platforms))
		for platform, platformValue := range agg.platforms {
			var platformDue float64
			if nisabReached && value > 0 {
				platformDue = (platformValue / value) * zakatDue
			}
			breakdown = append(breakdown, PlatformShareDto{
				Platform: platform,
				Value:    platformValue,
				ZakatDue: platformDue,
			})
		}

		dto := TrackerDto{
			Category:          category,
			Value:             &value,
			Nisab:             currentNisab,
			NisabReached:      nisabReached,
			ZakatDue:          zakatDue,
			PlatformBreakdown: breakdown,
		}

		// attach tracker data if exists
		if tracker, ok := trackerMap[category]; ok {
			dto.IsTracked = true
			dto.Id = &tracker.Id
			dto.UserId = tracker.UserId
			dto.LastPaidDate = tracker.LastPaidDate
			dto.Status = &tracker.Status
			dto.CreatedAt = tracker.CreatedAt
			dto.UpdatedAt = tracker.UpdatedAt

			if tracker.LastPaidDate != nil {
				h := hijri.Format(*tracker.LastPaidDate)
				dto.LastPaidDateHijri = &h
			}

			status, nextDue, newHaulStart := computeHaulStatus(tracker.HaulStartDate, tracker.LastPaidDate, nisabReached, now)
			dto.HaulStatus = status
			dto.NextDueDate = nextDue
			dto.HaulStartDate = newHaulStart
			if nextDue != nil {
				h := hijri.Format(*nextDue)
				dto.NextDueDateHijri = &h
			}

			if (tracker.HaulStartDate == nil) != (newHaulStart == nil) {
				if err := s.updateHaulStartDate(category, newHaulStart); err != nil {
					return nil, err
				}
			}
		}

		trackerDtos = append(trackerDtos, dto)
	}

	return &trackerDtos, nil
}

// computeHaulStatus derives the haul (zakat year) status from the category's
// current haul start date and whether nisab is currently held.
//
// Per fiqh, the haul only needs nisab to be held at the start and end of the
// year, not continuously throughout — so a mid-cycle dip below nisab does
// not reset haulStart. It's only reset (set back to nil) once the cycle
// completes (one Hijri year elapsed) while nisab is not held at that point.
//
// When there's no recorded haul start yet, it anchors to lastPaidDate (the
// last time zakat was actually paid, which starts a fresh cycle) rather
// than "now" — "now" is only used as a last resort when zakat has never
// been paid for this category either.
func computeHaulStatus(haulStart *time.Time, lastPaidDate *time.Time, nisabReached bool, now time.Time) (status string, nextDue *time.Time, newHaulStart *time.Time) {
	start := haulStart
	if start == nil {
		if !nisabReached {
			return "PENDING", nil, nil
		}
		if lastPaidDate != nil {
			start = lastPaidDate
		} else {
			t := now
			start = &t
		}
	}

	due := hijri.AddHijriYear(*start)
	daysUntilDue := int(due.Sub(now).Hours() / 24)

	if daysUntilDue <= 0 {
		if !nisabReached {
			return "PENDING", nil, nil
		}
		return "OVERDUE", &due, start
	}
	if daysUntilDue <= dueWindowDays {
		return "DUE", &due, start
	}
	return "PENDING", &due, start
}

func (s *Service) GetAllTrackers() (*[]ZakatTracker, error) {
	var trackers []ZakatTracker

	err := db.GetDB().Select(&trackers, `SELECT * from zakat_tracker WHERE status = 'ACTIVE'`)

	if err != nil {
		return nil, err
	}

	return &trackers, nil
}

func (s *Service) updateHaulStartDate(category string, haulStart *time.Time) error {
	_, err := db.GetDB().Exec(
		`UPDATE zakat_tracker SET haul_start_date = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?`,
		haulStart, category,
	)
	return err
}

func (s *Service) UpsertTracker(req *UpdateRequest) error {
	if req.Category != nil {
		upper := strings.ToUpper(*req.Category)
		req.Category = &upper
	}

	// A payment starts a fresh haul cycle from the payment date. When no
	// payment date is given (e.g. just toggling tracking on/off), leave the
	// existing haul_start_date alone via COALESCE.
	var haulStart *time.Time
	if req.LastPaidDate != nil {
		haulStart = req.LastPaidDate
	}

	query := `INSERT INTO zakat_tracker
		(user_id, category, last_paid_date, haul_start_date, status, created_at, updated_at)
		VALUES
		(:user_id, :category, :last_paid_date, :haul_start_date, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

		ON CONFLICT(category) DO UPDATE SET
		last_paid_date = COALESCE(excluded.last_paid_date, zakat_tracker.last_paid_date),
		haul_start_date = COALESCE(excluded.haul_start_date, zakat_tracker.haul_start_date),
		status = excluded.status,
		updated_at = CURRENT_TIMESTAMP;`

	args := map[string]any{
		"user_id":         req.UserId,
		"category":        req.Category,
		"last_paid_date":  req.LastPaidDate,
		"haul_start_date": haulStart,
		"status":          req.Status,
	}

	_, err := db.GetDB().NamedExec(query, args)

	return err
}
