from pydantic import BaseModel


class Character(BaseModel):
    name: str
    description: str = ""
    traits: list[str] = []
    notes: str = ""


class StoryEvent(BaseModel):
    name: str
    description: str = ""
    chapter_refs: list[str] = []


class Environment(BaseModel):
    name: str
    description: str = ""
    details: dict[str, str] = {}


class StoryObject(BaseModel):
    name: str
    description: str = ""
    significance: str = ""
    notes: str = ""


class StoryMetadata(BaseModel):
    title: str = ""
    genre: str = ""
    setting: str = ""
    time_period: str = ""
    pov: str = ""
    tone: str = ""
    synopsis: str = ""


class StoryBible(BaseModel):
    metadata: StoryMetadata = StoryMetadata()
    characters: list[Character] = []
    events: list[StoryEvent] = []
    environment: list[Environment] = []
    objects: list[StoryObject] = []
