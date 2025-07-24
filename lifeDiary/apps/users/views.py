from django.shortcuts import render, redirect
from django.contrib.auth import logout
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.views import LoginView
from django.contrib import messages
from django.urls import reverse_lazy

def user_logout(request):
    """
    사용자 로그아웃
    """
    logout(request)
    messages.success(request, '성공적으로 로그아웃되었습니다.')
    return redirect('home')

def signup(request):
    """
    사용자 회원가입
    """
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, '회원가입이 완료되었습니다. 로그인해주세요.')
            return redirect('users:login')
    else:
        form = UserCreationForm()
    
    # Bootstrap 클래스 추가
    form.fields['username'].widget.attrs.update({'class': 'form-control'})
    form.fields['password1'].widget.attrs.update({'class': 'form-control'})
    form.fields['password2'].widget.attrs.update({'class': 'form-control'})
    
    return render(request, 'users/signup.html', {'form': form})

class CustomLoginView(LoginView):
    """
    커스텀 로그인 뷰
    """
    template_name = 'users/login.html'
    
    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # Bootstrap 클래스 추가
        form.fields['username'].widget.attrs.update({'class': 'form-control'})
        form.fields['password'].widget.attrs.update({'class': 'form-control'})
        return form
    
    def get_success_url(self):
        """로그인 성공 후 리다이렉트 URL"""
        return reverse_lazy('home')
    
    def form_valid(self, form):
        messages.success(self.request, f'{form.get_user().username}님, 환영합니다!')
        return super().form_valid(form)
