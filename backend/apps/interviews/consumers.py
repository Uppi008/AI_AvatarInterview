"""Live interview WebSocket consumer.

The full duplex protocol — question delivery, TTS audio streaming, STT
transcript ingestion, proctoring event relay, and violation-triggered
termination — is implemented in Phase 7 alongside camera monitoring; the
two share a single connection per docs/ARCHITECTURE.md section 2. This
stub exists so config/asgi.py has a real consumer to route to from
Phase 3 onward.
"""
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class InterviewSessionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.group_name = f"interview_{self.session_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # TODO(Phase 7): dispatch on content["type"] -- answer_chunk,
        # proctoring_event, skip_question, repeat_question, end_interview.
        await self.send_json({"type": "ack", "received": content.get("type")})
