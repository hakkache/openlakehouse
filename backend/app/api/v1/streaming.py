from fastapi import APIRouter, Depends

from app.core.kafka_client import is_kafka_available, list_topic_status
from app.core.security import CurrentUser, get_current_user
from app.schemas.streaming import StreamingStatus, TopicStatus

router = APIRouter(prefix="/streaming", tags=["streaming"])


@router.get("/status", response_model=StreamingStatus)
def get_streaming_status(user: CurrentUser = Depends(get_current_user)) -> StreamingStatus:
    """Real Kafka topic/partition/offset/lag status (no simulated data).

    Returns an empty topic list with `kafka_available: false` if the Kafka broker
    is unreachable (e.g. the `streaming` compose profile hasn't been started).
    """
    if not is_kafka_available():
        return StreamingStatus(kafka_available=False, topics=[])
    topics = [TopicStatus(**t) for t in list_topic_status()]
    return StreamingStatus(kafka_available=True, topics=topics)
