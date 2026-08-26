package asset

import "time"

type Asset struct {
	Id        uint       `db:"id" json:"id" form:"id"`
	UserId    *uint      `db:"user_id" json:"user_id" form:"user_id"`
	Category  string     `db:"category" json:"category" form:"category"`
	Name      string     `db:"name" json:"name" form:"name"`
	Quantity  *float64   `db:"quantity" json:"quantity" form:"quantity"`
	Price     *float64   `db:"price" json:"price" form:"price"`
	Unit      string     `db:"unit" json:"unit" form:"unit"`
	Goal      *float64   `db:"goal" json:"goal" form:"goal"`
	Status    string     `db:"status" json:"status" form:"status"`
	CreatedAt time.Time  `db:"created_at" json:"created_at" form:"created_at"`
	UpdatedAt *time.Time `db:"updated_at" json:"updated_at" form:"updated_at"`
}

//reuqest
type CreateAssetRequest struct {
	UserId   uint     `db:"user_id" json:"user_id" form:"user_id"`
	Category string   `db:"category" json:"category" form:"category"`
	Name     string   `db:"name" json:"name" form:"name"`
	Quantity *float64 `db:"quantity" json:"quantity" form:"quantity"`
	Price    *float64 `db:"price" json:"price" form:"price"`
	Unit     string   `db:"unit" json:"unit" form:"unit"`
	Goal     *float64 `db:"goal" json:"goal" form:"goal"`
	Status   string   `db:"status" json:"status" form:"status"`
}

type UpdateAssetRequest struct {
	Id            uint     `json:"id"`
	Category      *string  `db:"category" json:"category" form:"category"`
	Name          *string  `db:"name" json:"name" form:"name"`
	Quantity      *float64 `db:"quantity" json:"quantity" form:"quantity"`
	Price         *float64 `db:"price" json:"price" form:"price"`
	Unit          *string  `db:"unit" json:"unit" form:"unit"`
	Goal          *float64 `db:"goal" json:"goal" form:"goal"`
	Status        *string  `db:"status" json:"status" form:"status"`
	TotalInvested *float64 `db:"total_invested" json:"total_invested" form:"total_invested"`
}

type UpdateValueRequest struct {
	UpdateType         string   `json:"update_type"`
	Quantity           *int64   `db:"quantity" json:"quantity" form:"quantity"`
	PricePerUnit       *float64 `db:"price_per_unit" json:"price_per_unit" form:"price_per_unit"`
	MarketPricePerUnit *float64 `db:"market_price_per_unit" json:"market_price_per_unit" form:"market_price_per_unit"`
}
