package helper

import (
	"encoding/json"
	"log"
)

func LogJson(v any) {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		log.Println("json marshal error:", err)
	}
	log.Println(string(b))
}
