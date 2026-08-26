package asset

import "time"

type Asset struct {
	Id          uint     `db:"id" json:"id" form:"id"`
	UserId      *uint    `db:"user_id" json:"user_id" form:"user_id"`
	Platform    *string  `db:"platform" json:"platform" form:"platform"`
	Category    string   `db:"category" json:"category" form:"category"`
	Name        string   `db:"name" json:"name" form:"name"`
	Quantity    *float64 `db:"quantity" json:"quantity" form:"quantity"`
	Price       *float64 `db:"price" json:"price" form:"price"`
	Unit        string   `db:"unit" json:"unit" form:"unit"`
	Goal        *float64 `db:"goal" json:"goal" form:"goal"`
	CostBasis   *float64 `db:"cost_basis" json:"cost_basis" form:"cost_basis"`
	Note        *string  `db:"note" json:"note" form:"note"`
	IsCalculate bool     `db:"is_calculate" json:"is_calculate" form:"is_calculate"`
	// PlatformTotal, when set, marks this asset as its platform's
	// catch-all balance: Price is derived at read time as
	// PlatformTotal minus the sum of the other assets sharing the
	// same category+platform, instead of being entered by hand.
	PlatformTotal *float64   `db:"platform_total" json:"platform_total" form:"platform_total"`
	Status        string     `db:"status" json:"status" form:"status"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at" form:"created_at"`
	UpdatedAt     *time.Time `db:"updated_at" json:"updated_at" form:"updated_at"`
}

//reuqest
type CreateAssetRequest struct {
	UserId        uint     `db:"user_id" json:"user_id" form:"user_id"`
	Platform      *string  `db:"platform" json:"platform" form:"platform"`
	Category      string   `db:"category" json:"category" form:"category"`
	Name          string   `db:"name" json:"name" form:"name"`
	Quantity      *float64 `db:"quantity" json:"quantity" form:"quantity"`
	Price         *float64 `db:"price" json:"price" form:"price"`
	Unit          string   `db:"unit" json:"unit" form:"unit"`
	Goal          *float64 `db:"goal" json:"goal" form:"goal"`
	CostBasis     *float64 `db:"cost_basis" json:"cost_basis" form:"cost_basis"`
	Note          *string  `db:"note" json:"note" form:"note"`
	IsCalculate   *bool    `db:"is_calculate" json:"is_calculate" form:"is_calculate"`
	PlatformTotal *float64 `db:"platform_total" json:"platform_total" form:"platform_total"`
	Status        string   `db:"status" json:"status" form:"status"`
}

type UpdateAssetRequest struct {
	Id            uint     `json:"id"`
	Platform      *string  `db:"platform" json:"platform" form:"platform"`
	Category      *string  `db:"category" json:"category" form:"category"`
	Name          *string  `db:"name" json:"name" form:"name"`
	Quantity      *float64 `db:"quantity" json:"quantity" form:"quantity"`
	Price         *float64 `db:"price" json:"price" form:"price"`
	Unit          *string  `db:"unit" json:"unit" form:"unit"`
	Goal          *float64 `db:"goal" json:"goal" form:"goal"`
	CostBasis     *float64 `db:"cost_basis" json:"cost_basis" form:"cost_basis"`
	Note          *string  `db:"note" json:"note" form:"note"`
	IsCalculate   *bool    `db:"is_calculate" json:"is_calculate" form:"is_calculate"`
	PlatformTotal *float64 `db:"platform_total" json:"platform_total" form:"platform_total"`
	// ClearPlatformTotal lets the client turn a catch-all entry back into
	// a normal manually-priced one, since a bare `null` for
	// PlatformTotal is indistinguishable from "field omitted" via JSON.
	ClearPlatformTotal bool    `json:"clear_platform_total"`
	Status             *string `db:"status" json:"status" form:"status"`
}
