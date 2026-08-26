package helper

func Deref[T any, P ~*T](p P) (T, bool) {
	if p == nil {
		var zero T
		return zero, false
	}
	return *p, true
}

/*
usage:
	if req.Category != nil {
		set = append(set, "category = :category")
		args["category"] = *req.Category
	}
*/
