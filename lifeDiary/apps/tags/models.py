from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError

# Create your models here.


class Tag(models.Model):
    """
    사용자별 태그 관리
    - 이름: 태그명 (예: "업무", "운동", "식사")
    - 색상: HEX 색상 코드 (예: "#FF5733")
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name="사용자",
        null=True,
        blank=True,
        help_text="null이면 기본 태그 (모든 사용자 공용)",
    )
    name = models.CharField(
        max_length=50, verbose_name="태그명", help_text="최대 50자까지 입력 가능"
    )
    color = models.CharField(
        max_length=7,
        validators=[
            RegexValidator(
                regex=r"^#[0-9A-Fa-f]{6}$",
                message="올바른 HEX 색상 코드를 입력하세요 (예: #FF5733)",
            )
        ],
        verbose_name="색상",
        help_text="HEX 색상 코드 (예: #FF5733)",
    )
    is_default = models.BooleanField(
        default=False,
        verbose_name="기본 태그",
        help_text="관리자가 등록한 모든 사용자 공용 태그",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")

    class Meta:
        verbose_name = "태그"
        verbose_name_plural = "태그들"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name"],
                name="unique_user_tag_name",
                violation_error_message="이미 같은 이름의 태그가 존재합니다.",
                condition=models.Q(user__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["name"],
                name="unique_default_tag_name",
                violation_error_message="이미 같은 이름의 기본 태그가 존재합니다.",
                condition=models.Q(is_default=True),
            ),
        ]
        ordering = ["name"]

    def __str__(self):
        if self.is_default:
            return f"[기본] {self.name}"
        return f"{self.user.username if self.user else '시스템'} - {self.name}"

    def clean(self):
        """추가 유효성 검사"""
        super().clean()
        if self.name:
            self.name = self.name.strip()
            if not self.name:
                raise ValidationError({"name": "태그명은 공백일 수 없습니다."})
