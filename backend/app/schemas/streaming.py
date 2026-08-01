from pydantic import BaseModel


class TopicStatus(BaseModel):
    topic: str
    partitions: int
    messages: int
    lag: int
    status: str


class StreamingStatus(BaseModel):
    kafka_available: bool
    topics: list[TopicStatus]
