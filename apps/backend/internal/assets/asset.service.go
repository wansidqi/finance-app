package asset

import (
	"go-fiber-app/pkg/db"
	"go-fiber-app/pkg/helper"
	"strings"
)

type Service struct{}

func AssetService() *Service {
	return &Service{}
}

func (s *Service) Create(req *CreateAssetRequest) (*Asset, error) {

	query := `INSERT INTO assets
			(user_id, category, name, quantity, unit, goal, price, status)
			VALUES ( :user_id, :category, :name, :quantity, :unit, :goal, :price, :status)`

	args := map[string]any{
		"user_id":  req.UserId,
		"category": req.Category,
		"name":     req.Name,
		"quantity": req.Quantity,
		"price":    req.Price,
		"unit":     req.Unit,
		"goal":     req.Goal,
		"status":   "ACTIVE",
	}

	result, err := db.GetDB().NamedExec(query, args)

	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()

	if err != nil {
		return nil, err
	}

	asset, err := s.GetAssetById(int(id))

	return asset, err
}

func (s *Service) GetAssetById(id int) (*Asset, error) {
	asset := new(Asset)
	err := db.GetDB().Get(asset, "SELECT * FROM assets WHERE id = ?", int(id))

	if err != nil {
		return nil, err
	}

	return asset, err
}

func (s *Service) GetAllAssets() ([]Asset, error) {
	var assets []Asset
	query := `SELECT * FROM assets where status = 'ACTIVE'`

	err := db.GetDB().Select(&assets, query)

	return assets, err
}

func (s *Service) Update(id int, req *UpdateAssetRequest) (*Asset, error) {

	if _, err := s.GetAssetById(id); err != nil {
		return nil, err
	}

	args := map[string]any{"id": id}
	set := []string{"updated_at = NOW()"}

	helper.UpdateField(req.Category, "category", &set, args)
	helper.UpdateField(req.Goal, "goal", &set, args)
	helper.UpdateField(req.Name, "name", &set, args)
	helper.UpdateField(req.Quantity, "quantity", &set, args)
	helper.UpdateField(req.Status, "status", &set, args)
	helper.UpdateField(req.Unit, "unit", &set, args)
	helper.UpdateField(req.TotalInvested, "total_invested", &set, args)

	if len(set) == 1 {
		return nil, nil
	}

	query := `UPDATE assets SET ` + strings.Join(set, ", ") + ` WHERE id = :id`
	if _, err := db.GetDB().NamedExec(query, args); err != nil {
		return nil, err
	}

	return s.GetAssetById(id)
}

func (s *Service) Delete(id int) error {
	query := `DELETE FROM assets WHERE id = ?;`
	_, err := db.GetDB().Exec(query, id)
	return err
}
