package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"

	"cloud.google.com/go/firestore"
	"github.com/gorilla/websocket"
)

type ClassifyRequest struct {
	URL string `json:"url"`
}

type ClassifyResponse struct {
	Result string `json:"result"` // "nsfw", "porn", or "normal"
}

var nsfwKeywords = []string{
	"porn", "xxx", "sex", "adult", "cam", "nude", "erotic", "nsfw", "hentai", "redtube", "xvideos", "xnxx", "brazzers", "playboy", "escort", "incest", "milf", "anal", "blowjob", "cumshot", "gangbang", "hardcore", "lesbian", "gay", "fetish", "bdsm", "shemale", "trans", "dildo", "masturbate", "orgasm", "pussy", "dick", "cock", "boobs", "tits", "busty", "slut", "whore", "strip", "stripper", "webcam", "onlyfans",
}

var firebaseApp *firebase.App
var firestoreClient *firestore.Client

func initFirebase() error {
	opt := option.WithCredentialsFile("serviceAccountKey.json")
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		return fmt.Errorf("error initializing app: %v", err)
	}
	firebaseApp = app
	log.Println("Firebase initialized!")

	// Initialize Firestore
	firestoreClient, err = app.Firestore(context.Background())
	if err != nil {
		return fmt.Errorf("error initializing Firestore: %v", err)
	}
	log.Println("Firestore initialized!")
	return nil
}

func classifyHandler(w http.ResponseWriter, r *http.Request) {
	var req ClassifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	url := strings.ToLower(req.URL)
	result := "normal"
	for _, keyword := range nsfwKeywords {
		if strings.Contains(url, keyword) {
			if keyword == "porn" || keyword == "xxx" || keyword == "sex" || keyword == "nsfw" {
				result = "porn"
			} else {
				result = "nsfw"
			}
			break
		}
	}
	resp := ClassifyResponse{Result: result}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// --- WebRTC Signaling ---
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type SignalMessage struct {
	RoomID  string `json:"roomId"`
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

var rooms = make(map[string]map[*websocket.Conn]bool)

func signalingHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	var currentRoom string

	for {
		var msg SignalMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Println("WebSocket read error:", err)
			break
		}

		if msg.Type == "join" {
			currentRoom = msg.RoomID
			if rooms[currentRoom] == nil {
				rooms[currentRoom] = make(map[*websocket.Conn]bool)
			}
			rooms[currentRoom][conn] = true
			log.Printf("Client joined room: %s", currentRoom)
			continue
		}

		// Broadcast signaling messages to all peers in the room except sender
		for c := range rooms[msg.RoomID] {
			if c != conn {
				c.WriteJSON(msg)
			}
		}
	}

	// Cleanup on disconnect
	if currentRoom != "" {
		delete(rooms[currentRoom], conn)
		if len(rooms[currentRoom]) == 0 {
			delete(rooms, currentRoom)
		}
	}
}

func main() {
	if _, err := os.Stat("serviceAccountKey.json"); os.IsNotExist(err) {
		log.Fatal("serviceAccountKey.json not found. Please add your Firebase service account key.")
	}
	if err := initFirebase(); err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}

	http.HandleFunc("/classify", classifyHandler)
	http.HandleFunc("/signal", signalingHandler)
	log.Println("Backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
