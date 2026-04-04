from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:9000/auth/callback"

    # JWT
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # Fly.io Machines API
    fly_api_token: str = ""
    fly_app_name: str = "wa-workers"
    fly_region: str = "sjc"
    fly_worker_image: str = "registry.fly.io/wa-workers:latest"

    # Session management
    idle_timeout_minutes: int = 15
    max_sessions_per_user: int = 2

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpay_plan_monthly: str = ""
    razorpay_plan_annual: str = ""

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Frontend URL (for OAuth redirect after login)
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
