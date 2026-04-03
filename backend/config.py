from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = "sk-your-key-here"
    openai_model: str = "gpt-4o"
    openai_temperature: float = 0.7
    data_dir: str = "./data"
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
