package asset

import (
	"errors"
	"go-fiber-app/pkg/db"
	"go-fiber-app/pkg/helper"
	"go-fiber-app/pkg/nisab"
	"strings"
)

type Service struct{}

func AssetService() *Service {
	return &Service{}
}

func (s *Service) Create(req *CreateAssetRequest) (*Asset, error) {

	isCalculate := true
	if req.IsCalculate != nil {
		isCalculate = *req.IsCalculate
	}

	category := strings.ToUpper(req.Category)

	if req.PlatformTotal != nil {
		platform := ""
		if req.Platform != nil {
			platform = strings.TrimSpace(*req.Platform)
		}
		if platform == "" {
			return nil, errors.New("platform is required to set a platform total")
		}

		exists, err := s.hasPlatformTotal(category, platform, nil)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("this platform already has a balance total set on another entry")
		}
	}

	useLiveGoldPrice := false
	if req.UseLiveGoldPrice != nil {
		useLiveGoldPrice = *req.UseLiveGoldPrice
	}

	query := `INSERT INTO assets
			(user_id, platform, category, name, quantity, unit, goal, price, cost_basis, note, is_calculate, platform_total, use_live_gold_price, status)
			VALUES ( :user_id, :platform, :category, :name, :quantity, :unit, :goal, :price, :cost_basis, :note, :is_calculate, :platform_total, :use_live_gold_price, :status)`

	args := map[string]any{
		"user_id":             req.UserId,
		"platform":            req.Platform,
		"category":            category,
		"name":                req.Name,
		"quantity":            req.Quantity,
		"price":               req.Price,
		"unit":                req.Unit,
		"goal":                req.Goal,
		"cost_basis":          req.CostBasis,
		"note":                req.Note,
		"is_calculate":        isCalculate,
		"platform_total":      req.PlatformTotal,
		"use_live_gold_price": useLiveGoldPrice,
		"status":              "ACTIVE",
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

	if asset.PlatformTotal != nil && asset.Platform != nil {
		if err := s.applyComputedPrice(asset); err != nil {
			return nil, err
		}
	}

	applyLiveGoldPrice(asset)

	return asset, err
}

func (s *Service) GetAllAssets() ([]Asset, error) {
	var assets []Asset
	query := `SELECT * FROM assets where status = 'ACTIVE'`

	err := db.GetDB().Select(&assets, query)
	if err != nil {
		return nil, err
	}

	applyComputedPrices(assets)
	for i := range assets {
		applyLiveGoldPrice(&assets[i])
	}

	return assets, nil
}

func (s *Service) Update(id int, req *UpdateAssetRequest) (*Asset, error) {

	existing, err := s.GetAssetById(id)
	if err != nil {
		return nil, err
	}

	category := existing.Category
	if req.Category != nil {
		upper := strings.ToUpper(*req.Category)
		req.Category = &upper
		category = upper
	}

	platform := ""
	if existing.Platform != nil {
		platform = *existing.Platform
	}
	if req.Platform != nil {
		platform = strings.TrimSpace(*req.Platform)
	}

	if req.PlatformTotal != nil {
		if platform == "" {
			return nil, errors.New("platform is required to set a platform total")
		}

		exists, err := s.hasPlatformTotal(category, platform, &id)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("this platform already has a balance total set on another entry")
		}
	}

	args := map[string]any{"id": id}
	set := []string{"updated_at = CURRENT_TIMESTAMP"}

	helper.UpdateField(req.Platform, "platform", &set, args)
	helper.UpdateField(req.Category, "category", &set, args)
	helper.UpdateField(req.Goal, "goal", &set, args)
	helper.UpdateField(req.Name, "name", &set, args)
	helper.UpdateField(req.Quantity, "quantity", &set, args)
	helper.UpdateField(req.Price, "price", &set, args)
	helper.UpdateField(req.CostBasis, "cost_basis", &set, args)
	helper.UpdateField(req.Note, "note", &set, args)
	helper.UpdateField(req.IsCalculate, "is_calculate", &set, args)
	helper.UpdateField(req.UseLiveGoldPrice, "use_live_gold_price", &set, args)
	helper.UpdateField(req.Status, "status", &set, args)
	helper.UpdateField(req.Unit, "unit", &set, args)

	if req.ClearPlatformTotal {
		set = append(set, "platform_total = NULL")
	} else {
		helper.UpdateField(req.PlatformTotal, "platform_total", &set, args)
	}

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

// hasPlatformTotal reports whether another asset in the same category+
// platform already tracks that platform's real total, since only one
// entry per platform can act as the catch-all balance.
func (s *Service) hasPlatformTotal(category, platform string, excludeId *int) (bool, error) {
	query := `SELECT COUNT(*) FROM assets WHERE status = 'ACTIVE' AND category = ? AND platform = ? AND platform_total IS NOT NULL`
	args := []any{category, platform}

	if excludeId != nil {
		query += ` AND id != ?`
		args = append(args, *excludeId)
	}

	var count int
	if err := db.GetDB().Get(&count, query, args...); err != nil {
		return false, err
	}

	return count > 0, nil
}

// applyComputedPrice recomputes a single catch-all asset's Price against
// its current siblings, used by GetAssetById where the full asset list
// isn't already loaded.
func (s *Service) applyComputedPrice(target *Asset) error {
	var siblings []Asset
	query := `SELECT * FROM assets WHERE status = 'ACTIVE' AND category = ? AND platform = ? AND id != ?`
	if err := db.GetDB().Select(&siblings, query, target.Category, *target.Platform, target.Id); err != nil {
		return err
	}

	var sum float64
	for _, sibling := range siblings {
		if sibling.Price != nil {
			sum += *sibling.Price
		}
	}

	computed := *target.PlatformTotal - sum
	target.Price = &computed
	return nil
}

// applyLiveGoldPrice overrides, in place, the Price of an asset that opted
// into live gold pricing (UseLiveGoldPrice) to Quantity grams times today's
// BNM gold price per gram — the same live source zakat nisab is computed
// from, so a gold asset's value and the nisab it's compared against never
// drift apart because one was manually entered and went stale.
func applyLiveGoldPrice(a *Asset) {
	if !a.UseLiveGoldPrice || a.Quantity == nil {
		return
	}
	computed := *a.Quantity * nisab.PricePerGram()
	a.Price = &computed
}

// applyComputedPrices overrides, in place, the Price of every catch-all
// asset (one with PlatformTotal set) to PlatformTotal minus the sum of
// its non-catch-all siblings sharing the same category+platform. This
// keeps a platform's real, fluctuating total (e.g. a wallet earning
// daily interest) in sync without redistributing the change across the
// manually-earmarked entries.
func applyComputedPrices(assets []Asset) {
	type key struct {
		category string
		platform string
	}

	sums := map[key]float64{}
	catchAlls := map[key]int{}

	for i := range assets {
		a := &assets[i]
		if a.Platform == nil || strings.TrimSpace(*a.Platform) == "" {
			continue
		}

		k := key{a.Category, *a.Platform}

		if a.PlatformTotal != nil {
			catchAlls[k] = i
			continue
		}

		if a.Price != nil {
			sums[k] += *a.Price
		}
	}

	for k, idx := range catchAlls {
		computed := *assets[idx].PlatformTotal - sums[k]
		assets[idx].Price = &computed
	}
}
