from rest_framework.routers import DefaultRouter

from .views import AvatarViewSet, CustomAvatarViewSet

router = DefaultRouter()
router.register("custom", CustomAvatarViewSet, basename="custom-avatar")
router.register("", AvatarViewSet, basename="avatar")

urlpatterns = router.urls
