from django.contrib import admin
from django.utils.html import format_html
from .models import Tag

# Register your models here.


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "is_default", "color_display", "created_at"]
    list_filter = ["is_default", "user", "created_at"]
    search_fields = ["name", "user__username"]
    ordering = ["is_default", "user", "name"]
    list_per_page = 25

    fieldsets = (
        (None, {"fields": ("name", "color", "is_default")}),
        (
            "사용자 정보",
            {
                "fields": ("user",),
                "classes": ("collapse",),
                "description": "기본 태그인 경우 사용자를 비워두세요.",
            },
        ),
        (
            "시간 정보",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    readonly_fields = ("created_at", "updated_at")

    def color_display(self, obj):
        """색상을 시각적으로 표시"""
        return format_html(
            '<span style="background-color: {}; padding: 5px 15px; border-radius: 3px; color: white; font-weight: bold;">{}</span>',
            obj.color,
            obj.color,
        )

    color_display.short_description = "색상"

    def get_queryset(self, request):
        """쿼리 최적화"""
        return super().get_queryset(request).select_related("user")
