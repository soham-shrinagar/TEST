import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib import parse, request

from dotenv import load_dotenv
import instaloader


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False))


def fetch_public_web_profile(username):
    url = "https://www.instagram.com/api/v1/users/web_profile_info/?" + parse.urlencode({"username": username})
    req = request.Request(
        url,
        headers={
            "Accept": "*/*",
            "Referer": f"https://www.instagram.com/{username}/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            ),
            "X-IG-App-ID": "936619743392459",
        },
    )

    with request.urlopen(req, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    user = (payload.get("data") or {}).get("user")
    if not user:
        return {"error": f"Profile {username} does not exist or is not public."}

    timeline = user.get("edge_owner_to_timeline_media") or {}
    posts = [edge.get("node") or {} for edge in timeline.get("edges", [])[:12]]
    follower_count = int((user.get("edge_followed_by") or {}).get("count") or 0)
    recent_posts = []
    for post in posts:
        like_count = int(((post.get("edge_liked_by") or post.get("edge_media_preview_like") or {}).get("count") or 0))
        comment_count = int(((post.get("edge_media_to_comment") or {}).get("count") or 0))
        recent_posts.append({
            "shortcode": post.get("shortcode") or "",
            "display_url": post.get("display_url") or "",
            "like_count": like_count,
            "comment_count": comment_count,
            "is_video": post.get("__typename") == "GraphVideo" or bool(post.get("is_video")),
            "timestamp": post.get("taken_at_timestamp"),
        })

    avg_likes = sum(post["like_count"] for post in recent_posts) / len(recent_posts) if recent_posts else 0
    avg_comments = sum(post["comment_count"] for post in recent_posts) / len(recent_posts) if recent_posts else 0
    engagement_rate = round(((avg_likes + avg_comments) / follower_count) * 100, 2) if follower_count else 0

    return {
        "username": user.get("username") or username,
        "full_name": user.get("full_name") or user.get("username") or username,
        "profile_pic_url": user.get("profile_pic_url_hd") or user.get("profile_pic_url") or "",
        "follower_count": follower_count,
        "following_count": int((user.get("edge_follow") or {}).get("count") or 0),
        "media_count": int(timeline.get("count") or 0),
        "biography": user.get("biography") or "",
        "engagement_rate": engagement_rate,
        "avg_like_count": round(avg_likes),
        "avg_comment_count": round(avg_comments),
        "recent_posts": recent_posts,
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
        "source": "instagram_web",
    }


def fetch_instaloader_profile(username, dummy_user, dummy_pass):
    if not dummy_user or not dummy_pass:
        raise RuntimeError("Instaloader credentials are not configured.")

    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
    )

    session_dir = Path(__file__).resolve().parent / ".instaloader-session"
    session_dir.mkdir(exist_ok=True)
    session_file = session_dir / f"session-{dummy_user}"

    if session_file.exists():
        loader.load_session_from_file(dummy_user, str(session_file))
    else:
        loader.login(dummy_user, dummy_pass)
        loader.save_session_to_file(str(session_file))

    profile = instaloader.Profile.from_username(loader.context, username)
    posts = []
    for index, post in enumerate(profile.get_posts()):
        if index >= 12:
            break
        posts.append(post)

    avg_likes = sum(post.likes for post in posts) / len(posts) if posts else 0
    avg_comments = sum(post.comments for post in posts) / len(posts) if posts else 0
    engagement_rate = (
        round(((avg_likes + avg_comments) / profile.followers) * 100, 2)
        if profile.followers
        else 0
    )

    return {
        "username": profile.username,
        "full_name": profile.full_name,
        "profile_pic_url": str(profile.profile_pic_url),
        "follower_count": profile.followers,
        "following_count": profile.followees,
        "media_count": profile.mediacount,
        "biography": profile.biography,
        "engagement_rate": engagement_rate,
        "avg_like_count": round(avg_likes),
        "avg_comment_count": round(avg_comments),
        "recent_posts": [{
            "shortcode": post.shortcode,
            "display_url": str(post.url),
            "like_count": post.likes,
            "comment_count": post.comments,
            "is_video": post.is_video,
            "timestamp": post.date_utc.replace(tzinfo=timezone.utc).timestamp(),
        } for post in posts],
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
        "source": "instaloader",
    }


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        emit({"error": "Instagram username is required"})
        return

    env_path = os.getenv("DOTENV_PATH") or Path(__file__).resolve().parents[1] / "server" / ".env"
    load_dotenv(env_path)

    dummy_user = os.getenv("INSTA_DUMMY_USER")
    dummy_pass = os.getenv("INSTA_DUMMY_PASS")
    username = sys.argv[1].strip().lstrip("@")

    try:
        emit(fetch_instaloader_profile(username, dummy_user, dummy_pass))
    except Exception as instaloader_error:
        try:
            payload = fetch_public_web_profile(username)
            if payload.get("error"):
                payload["instaloader_error"] = str(instaloader_error)
            emit(payload)
        except Exception as web_error:
            emit({"error": str(web_error), "instaloader_error": str(instaloader_error)})


if __name__ == "__main__":
    main()
