package helper

func UpdateField[T any](value *T, column string, set *[]string, args map[string]any) {
	if value != nil {
		*set = append(*set, column+" = :"+column)
		args[column] = *value
	}
}
