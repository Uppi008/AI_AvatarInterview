"""Seeds the 10 built-in avatar personas (Module 3).

Generates a simple placeholder portrait per persona with Pillow (a colored
circle badge with initials) so the catalog has *something* real to render
immediately -- swap `image` for real artwork/photos whenever they're
available; nothing else about the avatar depends on how the image was made.
"""
import io

from django.db import migrations

AVATARS = [
    {
        "name": "Priya Sharma",
        "category": "hr_manager",
        "difficulty": "medium",
        "speaking_style": "Warm, professional, and encouraging",
        "interview_style": "Focuses on culture fit, communication, and past experience with structured behavioral questions.",
        "emotion_profile": {"warmth": 0.8, "formality": 0.5, "energy": 0.6},
        "voice_map": {"en": "en-US-JennyNeural", "hi": "hi-IN-SwaraNeural", "te": "te-IN-ShrutiNeural"},
        "color": (79, 70, 229),
    },
    {
        "name": "Arjun Mehta",
        "category": "technical_interviewer",
        "difficulty": "hard",
        "speaking_style": "Direct, precise, asks probing follow-ups",
        "interview_style": "Deep-dives into technical fundamentals, system design, and problem-solving under pressure.",
        "emotion_profile": {"warmth": 0.3, "formality": 0.7, "energy": 0.5},
        "voice_map": {"en": "en-US-GuyNeural", "hi": "hi-IN-MadhurNeural", "te": "te-IN-MohanNeural"},
        "color": (30, 64, 175),
    },
    {
        "name": "Rajesh Kumar",
        "category": "senior_manager",
        "difficulty": "hard",
        "speaking_style": "Measured, authoritative, values conciseness",
        "interview_style": "Assesses leadership potential, ownership, and strategic thinking with scenario-based questions.",
        "emotion_profile": {"warmth": 0.4, "formality": 0.8, "energy": 0.4},
        "voice_map": {"en": "en-US-DavisNeural", "hi": "hi-IN-MadhurNeural", "te": "te-IN-MohanNeural"},
        "color": (55, 65, 81),
    },
    {
        "name": "Vikram Malhotra",
        "category": "ceo",
        "difficulty": "hard",
        "speaking_style": "Formal, high-level, gets straight to impact and results",
        "interview_style": "Tests vision, business acumen, and how the candidate's work ties to outcomes.",
        "emotion_profile": {"warmth": 0.2, "formality": 0.9, "energy": 0.5},
        "voice_map": {"en": "en-US-DavisNeural", "hi": "hi-IN-MadhurNeural", "te": "te-IN-MohanNeural"},
        "color": (17, 24, 39),
    },
    {
        "name": "Ananya Reddy",
        "category": "female_hr",
        "difficulty": "medium",
        "speaking_style": "Friendly and conversational, puts candidates at ease",
        "interview_style": "Balanced mix of behavioral and role-fit questions with a relaxed pace.",
        "emotion_profile": {"warmth": 0.9, "formality": 0.4, "energy": 0.7},
        "voice_map": {"en": "en-US-AriaNeural", "hi": "hi-IN-SwaraNeural", "te": "te-IN-ShrutiNeural"},
        "color": (219, 39, 119),
    },
    {
        "name": "Karan Singh",
        "category": "male_hr",
        "difficulty": "medium",
        "speaking_style": "Approachable and clear, keeps things moving",
        "interview_style": "Standard HR round: background, motivation, and role expectations.",
        "emotion_profile": {"warmth": 0.7, "formality": 0.5, "energy": 0.6},
        "voice_map": {"en": "en-US-GuyNeural", "hi": "hi-IN-MadhurNeural", "te": "te-IN-MohanNeural"},
        "color": (5, 150, 105),
    },
    {
        "name": "Rohan",
        "category": "friendly_brother",
        "difficulty": "easy",
        "speaking_style": "Casual, encouraging, cracks the occasional joke",
        "interview_style": "Low-pressure practice round focused on building confidence, not catching you out.",
        "emotion_profile": {"warmth": 0.95, "formality": 0.1, "energy": 0.8},
        "voice_map": {"en": "en-US-GuyNeural", "hi": "hi-IN-MadhurNeural", "te": "te-IN-MohanNeural"},
        "color": (234, 88, 12),
    },
    {
        "name": "Meera",
        "category": "friendly_sister",
        "difficulty": "easy",
        "speaking_style": "Warm, patient, and supportive",
        "interview_style": "Gentle practice round that explains what a good answer looks like as you go.",
        "emotion_profile": {"warmth": 0.95, "formality": 0.1, "energy": 0.7},
        "voice_map": {"en": "en-US-AriaNeural", "hi": "hi-IN-SwaraNeural", "te": "te-IN-ShrutiNeural"},
        "color": (147, 51, 234),
    },
    {
        "name": "Sunita Aunty",
        "category": "parent_style",
        "difficulty": "easy",
        "speaking_style": "Nurturing and patient, like practicing with a parent",
        "interview_style": "Prioritizes putting the candidate at ease over rigorous evaluation, with lots of encouragement.",
        "emotion_profile": {"warmth": 1.0, "formality": 0.2, "energy": 0.5},
        "voice_map": {"en": "en-US-JennyNeural", "hi": "hi-IN-SwaraNeural", "te": "te-IN-ShrutiNeural"},
        "color": (202, 138, 4),
    },
    {
        "name": "Neha Kapoor",
        "category": "corporate_recruiter",
        "difficulty": "medium",
        "speaking_style": "Polished, process-driven, sticks to a structured script",
        "interview_style": "Simulates a real first-round recruiter screen: resume walkthrough, logistics, role fit.",
        "emotion_profile": {"warmth": 0.5, "formality": 0.7, "energy": 0.5},
        "voice_map": {"en": "en-US-AriaNeural", "hi": "hi-IN-SwaraNeural", "te": "te-IN-ShrutiNeural"},
        "color": (8, 145, 178),
    },
]

SUPPORTED_LANGUAGES = ["en", "hi", "te"]


def _generate_avatar_image(name: str, color: tuple) -> bytes:
    from PIL import Image, ImageDraw, ImageFont

    size = 512
    img = Image.new("RGB", (size, size), color)
    draw = ImageDraw.Draw(img)

    margin = 40
    lighter = tuple(min(255, c + 25) for c in color)
    draw.ellipse([margin, margin, size - margin, size - margin], fill=lighter)

    initials = "".join(part[0].upper() for part in name.split()[:2]) or "?"
    try:
        font = ImageFont.load_default(size=180)
    except TypeError:
        # Older Pillow: load_default() takes no size argument.
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), initials, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - text_w) / 2 - bbox[0], (size - text_h) / 2 - bbox[1]),
        initials,
        fill="white",
        font=font,
    )

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def seed_avatars(apps, schema_editor):
    from django.core.files.base import ContentFile

    Avatar = apps.get_model("avatars", "Avatar")

    for data in AVATARS:
        if Avatar.objects.filter(category=data["category"]).exists():
            continue

        avatar = Avatar(
            name=data["name"],
            category=data["category"],
            voice_map=data["voice_map"],
            speaking_style=data["speaking_style"],
            interview_style=data["interview_style"],
            difficulty=data["difficulty"],
            emotion_profile=data["emotion_profile"],
            supported_languages=SUPPORTED_LANGUAGES,
            is_active=True,
        )
        image_bytes = _generate_avatar_image(data["name"], data["color"])
        avatar.image.save(f"{data['category']}.png", ContentFile(image_bytes), save=False)
        avatar.save()


def remove_avatars(apps, schema_editor):
    Avatar = apps.get_model("avatars", "Avatar")
    Avatar.objects.filter(category__in=[a["category"] for a in AVATARS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("avatars", "0002_initial"),
    ]

    operations = [
        migrations.RunPython(seed_avatars, remove_avatars),
    ]
