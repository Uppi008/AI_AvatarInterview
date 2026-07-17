from .models import CustomAvatar


def queue_avatar_generation(custom_avatar: CustomAvatar) -> None:
    from .tasks import generate_custom_avatar_task

    generate_custom_avatar_task.delay(custom_avatar_id=str(custom_avatar.id))
