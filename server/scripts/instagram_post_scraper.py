import json
import re
import sys


def extract_shortcode(url):
    match = re.search(r"instagram\.com/(?:p|reel)/([^/?#]+)", url or "", re.IGNORECASE)
    return match.group(1) if match else ""


def main():
    post_url = sys.argv[1] if len(sys.argv) > 1 else ""
    shortcode = extract_shortcode(post_url)
    if not shortcode:
        print(json.dumps({"error": "Invalid Instagram post URL"}))
        return

    try:
        import instaloader

        loader = instaloader.Instaloader()
        post = instaloader.Post.from_shortcode(loader.context, shortcode)
        print(json.dumps({
            "owner_handle": post.owner_username,
            "like_count": post.likes,
            "comment_count": post.comments,
            "caption": post.caption,
            "posted_at": post.date_utc.isoformat(),
            "thumbnail_url": post.url,
            "is_video": post.is_video,
            "shortcode": post.shortcode,
        }, default=str))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))


if __name__ == "__main__":
    main()
