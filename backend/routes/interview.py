import os
import requests
import json
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models_interview import InterviewSession
from models_extended import Resume
from models import Job
from models_user import User
from schemas_interview import InterviewSessionCreate, InterviewSessionResponse, InterviewWebRTCOffer, InterviewWebRTCAnswer
from routes.auth import get_current_user
from datetime import datetime
import base64
import io
from pydub import AudioSegment

router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime/calls"

@router.post("/interview/sessions", response_model=InterviewSessionResponse)
async def create_interview_session(
    data: InterviewSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new interview prep session"""
    # Get resume (use latest if not specified)
    resume_id = data.resume_id
    if not resume_id:
        resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(Resume.uploaded_at.desc()).first()
        if resume:
            resume_id = resume.id
    
    # Validate job if specified
    if data.job_id:
        job = db.query(Job).filter(
            Job.id == data.job_id,
            Job.user_id == current_user.id
        ).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate voice selection
    if data.voice not in ["alloy", "shimmer"]:
        raise HTTPException(status_code=400, detail="Voice must be 'alloy' (male) or 'shimmer' (female)")
    
    # Create session
    session = InterviewSession(
        user_id=current_user.id,
        job_id=data.job_id,
        resume_id=resume_id,
        voice=data.voice,
        status="pending"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session

@router.post("/interview/{session_id}/start")
async def start_interview(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start interview - AI greets and asks first question"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get context
    job = None
    if session.job_id:
        job = db.query(Job).filter(Job.id == session.job_id).first()
    
    resume = None
    if session.resume_id:
        resume = db.query(Resume).filter(Resume.id == session.resume_id).first()
    
    # Build system message
    system_message = """You are a professional job interviewer. Keep responses brief (2-3 sentences). Ask relevant questions, provide feedback, and be encouraging."""
    
    if job:
        system_message += f"\n\nJob: {job.job_title} at {job.company_name}. Focus on fit for this role."
    
    if resume:
        resume_summary = resume.content[:800] if resume.content else "No resume provided"
        system_message += f"\n\nCandidate background:\n{resume_summary}"
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": "Please greet me and ask your first interview question."}
    ]
    
    # Update session
    session.status = "active"
    db.commit()
    
    # Make streaming request to OpenAI
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    payload = {
        "model": "gpt-4o-audio-preview",
        "modalities": ["text", "audio"],
        "audio": {
            "voice": session.voice,
            "format": "pcm16"
        },
        "messages": messages,
        "stream": True,
        "stream_options": {"include_usage": True}
    }
    
    full_transcript = []
    
    def event_stream():
        nonlocal full_transcript
        
        with requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            stream=True,
        ) as r:
            if r.status_code != 200:
                yield f"data: {json.dumps({'error': f'OpenAI API error: {r.text}'})}\n\n"
                return
            
            for line in r.iter_lines():
                if not line:
                    continue
                
                if line.startswith(b"data: "):
                    data_str = line[6:].decode('utf-8')
                    
                    if data_str == "[DONE]":
                        if full_transcript:
                            transcript_text = "".join(full_transcript)
                            messages.append({"role": "assistant", "content": transcript_text})
                            session.conversation_history = json.dumps(messages)
                            db.commit()
                        
                        yield f"data: {json.dumps({'done': True})}\n\n"
                        break
                    
                    try:
                        chunk = json.loads(data_str)
                        if chunk.get("choices"):
                            delta = chunk["choices"][0].get("delta", {})
                            audio_delta = delta.get("audio", {})
                            
                            transcript_piece = audio_delta.get("transcript", "")
                            audio_base64 = audio_delta.get("data", "")
                            
                            if transcript_piece:
                                full_transcript.append(transcript_piece)
                            
                            try:
                                response_data = {
                                    "transcript": transcript_piece,
                                    "audio": audio_base64,
                                    "done": False
                                }
                                yield f"data: {json.dumps(response_data, ensure_ascii=False)}\n\n"
                            except Exception as e:
                                print(f"Error encoding response: {e}")
                                continue
                    except json.JSONDecodeError:
                        continue
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream"
    )

from fastapi.responses import StreamingResponse

@router.post("/interview/chat")
async def interview_chat(
    session_id: int = Form(...),
    message: str = Form(""),
    audio_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send text/audio message to AI interviewer and stream audio response"""
    print(f"=== INTERVIEW CHAT REQUEST (STREAMING) ===")
    print(f"session_id: {session_id}")
    print(f"message: {message[:100] if message else '(audio only)'}...")
    print(f"audio_file: {audio_file.filename if audio_file else 'None'}")
    print(f"current_user: {current_user.username}")
    
    # Get session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session status to active
    if session.status == "pending":
        session.status = "active"
        db.commit()
    
    # Load or initialize conversation history
    if session.conversation_history:
        messages = json.loads(session.conversation_history)
    else:
        # First message - build system message with context
        job = None
        if session.job_id:
            job = db.query(Job).filter(Job.id == session.job_id).first()
        
        resume = None
        if session.resume_id:
            resume = db.query(Resume).filter(Resume.id == session.resume_id).first()
        
        # Build concise system message
        system_message = """You are a professional job interviewer. Keep responses brief (2-3 sentences). Ask relevant questions, provide feedback, and be encouraging."""
        
        if job:
            system_message += f"\n\nJob: {job.job_title} at {job.company_name}. Focus on fit for this role."
        
        if resume:
            # Only include key highlights, not full resume
            resume_summary = resume.content[:800] if resume.content else "No resume provided"
            system_message += f"\n\nCandidate background:\n{resume_summary}"
        
        messages = [{"role": "system", "content": system_message}]
    
    # Build user message content (can be text, audio, or both)
    content_parts = []
    
    if message:
        content_parts.append({
            "type": "text",
            "text": message
        })
    
    if audio_file is not None:
        raw_bytes = await audio_file.read()
        
        # Convert browser audio (webm/opus) to WAV for OpenAI
        # OpenAI Chat Completions only accepts 'wav' or 'mp3' for input_audio
        try:
            # Decode the webm/opus audio
            audio_segment = AudioSegment.from_file(io.BytesIO(raw_bytes), format="webm")
            
            # Convert to WAV
            wav_buffer = io.BytesIO()
            audio_segment.export(wav_buffer, format="wav")
            wav_bytes = wav_buffer.getvalue()
            
            # Encode to base64
            encoded = base64.b64encode(wav_bytes).decode("utf-8")
            
            content_parts.append({
                "type": "input_audio",
                "input_audio": {
                    "data": encoded,
                    "format": "wav"
                }
            })
        except Exception as e:
            print(f"Error converting audio: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to process audio file: {str(e)}")
    
    if not content_parts:
        raise HTTPException(status_code=400, detail="No text or audio provided")
    
    # Add user message to history
    messages.append({"role": "user", "content": content_parts})
    
    try:
        # Check if API key is configured
        if not OPENAI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured"
            )
        
        payload = {
            "model": "gpt-4o-audio-preview",
            "modalities": ["text", "audio"],
            "audio": {
                "voice": session.voice,
                "format": "pcm16"  # Required for streaming
            },
            "messages": messages,
            "stream": True,
            "stream_options": {"include_usage": True}
        }
        
        print(f"Streaming from OpenAI Chat Completions API...")
        
        # We need to collect transcript for history
        full_transcript = []
        
        def event_stream():
            nonlocal full_transcript
            
            with requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=payload,
                stream=True,
            ) as r:
                if r.status_code != 200:
                    print(f"OpenAI error: {r.text}")
                    yield f"data: {json.dumps({'error': f'OpenAI API error: {r.text}'})}\n\n"
                    return
                
                for line in r.iter_lines():
                    if not line:
                        continue
                    
                    # SSE lines start with "data: "
                    if line.startswith(b"data: "):
                        data_str = line[6:].decode('utf-8')
                        
                        if data_str == "[DONE]":
                            # Save conversation history with full transcript
                            if full_transcript:
                                transcript_text = "".join(full_transcript)
                                messages.append({"role": "assistant", "content": transcript_text})
                                session.conversation_history = json.dumps(messages)
                                db.commit()
                                print(f"Saved transcript: {transcript_text[:100]}...")
                            
                            yield f"data: {json.dumps({'done': True})}\n\n"
                            break
                        
                        try:
                            chunk = json.loads(data_str)
                            if chunk.get("choices"):
                                delta = chunk["choices"][0].get("delta", {})
                                audio_delta = delta.get("audio", {})
                                
                                transcript_piece = audio_delta.get("transcript", "")
                                audio_base64 = audio_delta.get("data", "")
                                
                                if transcript_piece:
                                    full_transcript.append(transcript_piece)
                                
                                # Send chunk to frontend
                                try:
                                    response_data = {
                                        "transcript": transcript_piece,
                                        "audio": audio_base64,
                                        "done": False
                                    }
                                    yield f"data: {json.dumps(response_data, ensure_ascii=False)}\n\n"
                                except Exception as e:
                                    print(f"Error encoding response: {e}")
                                    continue
                        except json.JSONDecodeError:
                            continue
        
        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream"
        )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in interview chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing interview chat: {str(e)}")

@router.post("/interview/sessions/{session_id}/end")
async def end_interview_session(
    session_id: int,
    duration_seconds: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """End an interview session"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.status = "completed"
    session.duration_seconds = duration_seconds
    session.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)
    
    return session.to_dict()

@router.get("/interview/sessions/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get interview session details"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

@router.get("/interview/sessions")
async def get_interview_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all interview sessions for current user"""
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.created_at.desc()).all()
    
    return [session.to_dict() for session in sessions]
