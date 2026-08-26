package liability

import "time"

type Liability struct {
	Id             uint       `json:"id" form:"id" db:"id"`
	UserId         *uint      `json:"user_id" form:"user_id" db:"user_id"`
	Category       string     `json:"category" form:"category" db:"category"`
	Name           *string    `json:"name" form:"name" db:"name"`
	TotalBalance   *float64   `json:"total_balance" form:"total_balance" db:"total_balance"`
	MonthlyPayment float64    `json:"monthly_payment" form:"monthly_payment" db:"monthly_payment"`
	Status         string     `json:"status" form:"status" db:"status"`
	CreatedAt      time.Time  `json:"created_at" form:"created_at" db:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" form:"updated_at" db:"updated_at"`
}

type UpdateLiabilityRequest struct {
	Category       *string    `json:"category" form:"category"`
	Name           *string    `json:"name" form:"name"`
	TotalBalance   *float64   `json:"total_balance" form:"total_balance"`
	MonthlyPayment *float64   `json:"monthly_payment" form:"monthly_payment"`
	Status         *string    `json:"status" form:"status"`
	CreatedAt      *time.Time `json:"created_at" form:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" form:"updated_at"`
}

type LiabilityDTO struct {
	Id             uint       `json:"id" form:"id" db:"id"`
	UserId         *uint      `json:"user_id" form:"user_id" db:"user_id"`
	Category       string     `json:"category" form:"category" db:"category"`
	Name           string     `json:"name" form:"name" db:"name"`
	TotalBalance   *float64   `json:"total_balance" form:"total_balance" db:"total_balance"`
	MonthlyPayment float64    `json:"monthly_payment" form:"monthly_payment" db:"monthly_payment"`
	RemainingMonth float64    `json:"remaining_month" form:"remaining_month" db:"remaining_month"`
	Status         string     `json:"status" form:"status" db:"status"`
	CreatedAt      time.Time  `json:"created_at" form:"created_at" db:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at" form:"updated_at" db:"updated_at"`
}
