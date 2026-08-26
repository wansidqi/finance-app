package liability

import (
	"go-fiber-app/pkg/db"
	"go-fiber-app/pkg/helper"
	"log"
	"strings"
)

type Service struct{}

func LiabilityService() *Service {
	return &Service{}
}

func (s *Service) CreateLiability(req *Liability) (*Liability, error) {
	query := `INSERT INTO liabilities (user_id, name, category, total_balance, monthly_payment, status)
	VALUES (:user_id, :name, :category, :total_balance, :monthly_payment, :status)`

	var totalBalance float64
	if v, ok := helper.Deref(req.TotalBalance); ok {
		totalBalance = v
	}

	args := map[string]any{
		"user_id":         req.UserId,
		"name":            req.Name,
		"category":        req.Category,
		"total_balance":   totalBalance,
		"monthly_payment": req.MonthlyPayment,
		"status":          "ACTIVE",
	}

	result, err := db.GetDB().NamedExec(query, args)

	if err != nil {
		log.Print("error create")
		return nil, err
	}

	id, err := result.LastInsertId()

	if err != nil {
		log.Print("error get created id")
		return nil, err
	}

	liability := new(Liability)
	err = db.GetDB().Get(liability, ` SELECT * FROM liabilities WHERE id = ?`, id)

	if err != nil {
		log.Print("error get created result: ", err)
		return nil, err
	}

	return liability, nil
}

func (s *Service) GetAllLiabilities() (*[]LiabilityDTO, error) {
	liabilities := new([]Liability)
	query := `SELECT * from liabilities where status = 'ACTIVE'`

	err := db.GetDB().Select(liabilities, query)
	var dtos []LiabilityDTO

	for _, l := range *liabilities {
		dto := liabilityDTO(&l)
		dtos = append(dtos, dto)
	}

	return &dtos, err
}

func (s *Service) GetLiability(id int) (*LiabilityDTO, error) {
	liability := new(Liability)
	err := db.GetDB().Get(liability, "SELECT * FROM liabilities WHERE id = ?", id)
	dto := liabilityDTO(liability)
	return &dto, err
}

func (s *Service) UpdateLiability(id int, req *UpdateLiabilityRequest) (*LiabilityDTO, error) {

	if _, err := s.GetLiability(id); err != nil {
		return nil, err
	}

	args := map[string]any{"id": id}
	set := []string{"updated_at = NOW()"}

	helper.UpdateField(req.Category, "category", &set, args)
	helper.UpdateField(req.MonthlyPayment, "monthly_payment", &set, args)
	helper.UpdateField(req.Name, "name", &set, args)
	helper.UpdateField(req.Status, "status", &set, args)
	helper.UpdateField(req.TotalBalance, "total_balance", &set, args)

	if len(set) == 1 {
		return nil, nil
	}

	query := `UPDATE liabilities SET ` + strings.Join(set, ", ") + ` WHERE id = :id`
	if _, err := db.GetDB().NamedExec(query, args); err != nil {
		return nil, err
	}

	return s.GetLiability(id)

}

func (s *Service) Delete(id int) error {
	query := `DELETE FROM liabilities WHERE id = ?;`
	_, err := db.GetDB().Exec(query, id)
	return err
}

func liabilityDTO(req *Liability) LiabilityDTO {

	totalBalance := 0.0

	if v, ok := helper.Deref(req.TotalBalance); ok {
		totalBalance = v
	}

	var monthlyBalance float64

	if totalBalance != 0 {
		monthlyBalance = totalBalance / req.MonthlyPayment
	}

	dto := LiabilityDTO{
		Id:             req.Id,
		UserId:         req.UserId,
		Category:       req.Category,
		Name:           *req.Name,
		TotalBalance:   req.TotalBalance,
		RemainingMonth: monthlyBalance,
		MonthlyPayment: req.MonthlyPayment,
		Status:         req.Status,
		CreatedAt:      req.CreatedAt,
		UpdatedAt:      req.UpdatedAt,
	}

	return dto
}
