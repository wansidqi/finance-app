package zakat

import (
	asset "go-fiber-app/internal/assets"
	"go-fiber-app/pkg/db"
)

type Service struct{}

func ZakatService() *Service {
	return &Service{}
}

func (s *Service) GetAllCategories_() (*[]TrackerDto, error) {
	assets, err := asset.AssetService().GetAllAssets()

	if err != nil {
		return nil, err
	}

	categories := map[string]float64{}

	for _, asset := range assets {
		if asset.Price != nil {
			categories[asset.Category] += *asset.Price
		}
	}

	return nil, err
}

func (s *Service) GetAllCategories() (*[]TrackerDto, error) {
	// 1️⃣ Get assets and aggregate values by category
	assets, err := asset.AssetService().GetAllAssets()
	if err != nil {
		return nil, err
	}

	var categories map[string]float64 = map[string]float64{}
	for _, asset := range assets {

		if asset.Price != nil {
			categories[asset.Category] += *asset.Price
		} else {
			categories[asset.Category] += *asset.Quantity
		}
	}

	// 2️⃣ Get active trackers
	trackers, err := s.GetAllTrackers()
	if err != nil {
		return nil, err
	}

	// 3️⃣ Index trackers by category
	var trackerMap map[string]ZakatTracker = map[string]ZakatTracker{}
	for _, tracker := range *trackers {
		trackerMap[tracker.Category] = tracker
	}

	// 4️⃣ Build DTOs (loop categories, not trackers)
	var trackerDtos []TrackerDto
	nisab := 85.0

	for category, value := range categories {
		dto := TrackerDto{
			Category: category,
			Value:    &value,
		}

		// attach tracker data if exists
		if tracker, ok := trackerMap[category]; ok {
			dto.Id = &tracker.Id
			dto.UserId = tracker.UserId
			dto.LastPaidDate = &tracker.LastPaidDate
			dto.Status = &tracker.Status
			dto.CreatedAt = tracker.CreatedAt
			dto.UpdatedAt = tracker.UpdatedAt
			dto.HaulStatus = "NOT_DUE"
			dto.NisabReached = value >= nisab
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
	query := `INSERT INTO zakat_tracker
		(user_id, category, last_paid_date, status, created_at, updated_at)
		VALUES
		(:user_id, :category, :last_paid_date, :status, NOW(), NOW())

		ON DUPLICATE KEY UPDATE
		last_paid_date = VALUES(last_paid_date),
		status = VALUES(status),
		updated_at = NOW();`

	args := map[string]any{
		"user_id":        req.UserId,
		"category":       req.Category,
		"last_paid_date": req.LastPaidDate,
		"status":         req.Status,
	}

	_, err := db.GetDB().NamedExec(query, args)

	return err
}
