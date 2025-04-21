from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileViewSet, ChatSessionViewSet, process_ai_message

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'files', FileViewSet, basename='file')
router.register(r'chat/sessions', ChatSessionViewSet, basename='chat_session')

# Define URL patterns
urlpatterns = [
    path('', include(router.urls)),
    path('assistant/', process_ai_message, name='process_ai_message'),
] 