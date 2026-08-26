package zakat

import (
	asset "go-fiber-app/internal/assets"
	"go-fiber-app/pkg/db"
	"strings"
)

type Service struct{}

func ZakatService() *Service {
	return &Service{}
}

const (
	// nisab is the Malaysia 2026 cash/tradeable-asset nisab threshold in RM,
	// used uniformly across categories since asset values are always stored in RM.
	nisab     = 29740.0
	zakatRate = 0.025
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
	var trackerDtos []TrackerDto

	for category, agg := range categories {
		value := agg.value
		nisabReached := value >= nisab

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
			NisabReached:      nisabReached,
			ZakatDue:          zakatDue,
			PlatformBreakdown: breakdown,
			HaulStatus:        "NOT_DUE",
		}

		// attach tracker data if exists
		if tracker, ok := trackerMap[category]; ok {
			dto.Id = &tracker.Id
			dto.UserId = tracker.UserId
			dto.LastPaidDate = &tracker.LastPaidDate
			dto.Status = &tracker.Status
			dto.CreatedAt = tracker.CreatedAt
			dto.UpdatedAt = tracker.UpdatedAt
		}

		trackerDtos = append(trackerDtos, dto)
	}

	return &trackerDtos, nil
}

func (s *Service) GetAllTrackers() (*[]ZakatTracker, error) {
	var trackers []ZakatTracker

	err := db.GetDB().Select(&trackers, `SELECT * from zakat_tracker WHERE status = 'ACTIVE'`)

	if err != nil {
		return nil, err
	}

	return &trackers, nil
}

func (s *Service) UpsertTracker(req *UpdateRequest) error {
	if req.Category != nil {
		upper := strings.ToUpper(*req.Category)
		req.Category = &upper
	}

	query := `INSERT INTO zakat_tracker
		(user_id, category, last_paid_date, status, created_at, updated_at)
		VALUES
		(:user_id, :category, :last_paid_date, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

		ON CONFLICT(category) DO UPDATE SET
		last_paid_date = excluded.last_paid_date,
		status = excluded.status,
		updated_at = CURRENT_TIMESTAMP;`

	args := map[string]any{
		"user_id":        req.UserId,
		"category":       req.Category,
		"last_paid_date": req.LastPaidDate,
		"status":         req.Status,
	}

	_, err := db.GetDB().NamedExec(query, args)

	return err
}
