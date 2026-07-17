from rest_framework.permissions import BasePermission

from apps.users.models import User


class IsStudent(BasePermission):
    """Allows access only to authenticated users with the student role."""

    message = "This action is only available to student accounts."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STUDENT
        )


class IsAdminRole(BasePermission):
    """Allows access only to authenticated users with the admin role."""

    message = "This action is only available to admin accounts."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsOwnerStudent(BasePermission):
    """Object-level check: the requesting user must own the object via its
    `student.user` (or `user`) relationship.
    """

    def has_object_permission(self, request, view, obj):
        owner_user = getattr(getattr(obj, "student", None), "user", None) or getattr(obj, "user", None)
        return owner_user is not None and owner_user == request.user
