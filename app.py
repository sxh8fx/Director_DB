from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from dotenv import load_dotenv
import os
from collections import Counter
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)  # enable CORS for all routes

BASE_URL = "https://api.themoviedb.org/3"


def tmdb_get(endpoint, params=None):
    """Helper to fetch from TMDB with API key"""
    if params is None:
        params = {}
    params["api_key"] = os.getenv("TMDB_API_KEY")
    response = requests.get(f"{BASE_URL}{endpoint}", params=params)
    return response.json()


def format_date(date_str):
    """Format date from yyyy-mm-dd or dd-mm-yyyy to '15 September 2025'."""
    if not date_str or date_str in ("N/A", "None", ""):
        return "N/A"
    try:
        # Try yyyy-mm-dd
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        try:
            # Try dd-mm-yyyy
            dt = datetime.strptime(date_str, "%d-%m-%Y")
        except Exception:
            return "N/A"
    return dt.strftime("%d %B %Y")


# 1. Search Director
@app.route("/search_director")
def search_director():
    name = request.args.get("name")
    data = tmdb_get("/search/person", {"query": name})
    return jsonify(data)


# 2. Director Bio & Details
@app.route("/director/<int:person_id>")
def director_details(person_id):
    data = tmdb_get(f"/person/{person_id}")
    return jsonify(data)


# 3. Director Images / Gallery
@app.route("/director/<int:person_id>/images")
def director_images(person_id):
    data = tmdb_get(f"/person/{person_id}/images")
    return jsonify(data)


# 4. Filmography (only as director, sorted, latest highlighted)
@app.route("/director/<int:person_id>/movies")
def director_movies(person_id):
    data = tmdb_get(f"/person/{person_id}/movie_credits")
    directed = [m for m in data.get("crew", []) if m.get("job") == "Director"]

    # Sort by release date descending
    directed_sorted = sorted(
        directed,
        key=lambda x: x.get("release_date", "0"),
        reverse=True
    )

    # Format release dates
    for m in directed_sorted:
        m["release_date"] = format_date(m.get("release_date"))

    # Highlight latest film
    latest_film = directed_sorted[0] if directed_sorted else None

    return jsonify({
        "latest_film": latest_film,
        "filmography": directed_sorted
    })


# 5. Film Details (runtime, budget, genres, cast/crew, similar, posters/backdrops)
@app.route("/movie/<int:movie_id>")
def movie_details(movie_id):
    data = tmdb_get(
        f"/movie/{movie_id}",
        {"append_to_response": "credits,similar,images"}
    )
    # Format release date
    data["release_date"] = format_date(data.get("release_date"))
    # Format cast/crew/similar movie release dates if needed
    return jsonify(data)


# 6. Popular Directors + known_for
@app.route("/popular_directors")
def popular_directors():
    data = tmdb_get("/person/popular")
    return jsonify(data)


# 7. Aggregate genres for director (over filmography)
@app.route("/director/<int:person_id>/genres")
def director_genres(person_id):
    data = tmdb_get(f"/person/{person_id}/movie_credits")
    directed = [m for m in data.get("crew", []) if m.get("job") == "Director"]

    genre_counter = Counter()
    for movie in directed:
        movie_details = tmdb_get(f"/movie/{movie['id']}")
        for g in movie_details.get("genres", []):
            genre_counter[g["name"]] += 1

    return jsonify(dict(genre_counter))


# 8. Frequent collaborators (actors/writers) with images
@app.route("/director/<int:person_id>/collaborators")
def director_collaborators(person_id):
    data = tmdb_get(f"/person/{person_id}/movie_credits")
    directed = [m for m in data.get("crew", []) if m.get("job") == "Director"]

    actor_counter = Counter()
    writer_counter = Counter()
    actor_images = {}
    writer_images = {}

    for movie in directed:
        credits = tmdb_get(f"/movie/{movie['id']}/credits")
        for actor in credits.get("cast", []):
            actor_counter[actor["id"], actor["name"]] += 1
            if actor["id"] not in actor_images and actor.get("profile_path"):
                actor_images[actor["id"]] = actor["profile_path"]
        for crew in credits.get("crew", []):
            if crew.get("job") in ["Writer", "Screenplay"]:
                writer_counter[crew["id"], crew["name"]] += 1
                if crew["id"] not in writer_images and crew.get("profile_path"):
                    writer_images[crew["id"]] = crew["profile_path"]

    top_actors = actor_counter.most_common(6)   # changed from 10 to 6
    top_writers = writer_counter.most_common(6) # changed from 5 to 6

    # Return id, name, count, image for each
    actors = [
        {
            "id": aid,
            "name": name,
            "count": count,
            "profile_path": actor_images.get(aid)
        }
        for (aid, name), count in top_actors
    ]
    writers = [
        {
            "id": wid,
            "name": name,
            "count": count,
            "profile_path": writer_images.get(wid)
        }
        for (wid, name), count in top_writers
    ]

    return jsonify({
        "actors": actors,
        "writers": writers
    })


if __name__ == "__main__":
    app.run(debug=True)