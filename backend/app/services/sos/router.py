"""
SOS endpoints — emergency contacts, session management, and public tracking page.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.engine import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.sos.sos_service import SosService, _build_tracking_url
from app.services.sos.schemas import (
    CreateEmergencyContactRequest,
    UpdateEmergencyContactRequest,
    EmergencyContactResponse,
    EmergencyContactListResponse,
    TriggerSosRequest,
    UpdateSosLocationRequest,
    SosSessionResponse,
    SosTrackingData,
)

router = APIRouter(prefix="/sos")


def _session_to_response(session, db: Session) -> SosSessionResponse:
    return SosSessionResponse(
        id=session.id,
        user_id=session.user_id,
        token=session.token,
        is_active=session.is_active,
        triggered_at=session.triggered_at,
        expires_at=session.expires_at,
        last_latitude=session.last_latitude,
        last_longitude=session.last_longitude,
        last_location_update=session.last_location_update,
        cancelled_at=session.cancelled_at,
        ride_id=session.ride_id,
        tracking_url=_build_tracking_url(session.token),
    )


# ------------------------------------------------------------------
# EMERGENCY CONTACTS
# ------------------------------------------------------------------

@router.get(
    "/contacts",
    response_model=EmergencyContactListResponse,
    summary="List my emergency contacts",
)
def list_contacts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    contacts = service.list_contacts(user)
    return EmergencyContactListResponse(contacts=contacts, total=len(contacts))


@router.post(
    "/contacts",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an emergency contact (max 3)",
)
def add_contact(
    data: CreateEmergencyContactRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    return service.add_contact(user, data)


@router.put(
    "/contacts/{contact_id}",
    response_model=EmergencyContactResponse,
    summary="Update an emergency contact",
)
def update_contact(
    contact_id: uuid.UUID,
    data: UpdateEmergencyContactRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    return service.update_contact(user, contact_id, data)


@router.delete(
    "/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an emergency contact",
)
def delete_contact(
    contact_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    service.delete_contact(user, contact_id)


# ------------------------------------------------------------------
# SOS TRIGGER
# ------------------------------------------------------------------

@router.post(
    "/trigger",
    response_model=SosSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger SOS — sends SMS to emergency contacts with live tracking link",
)
async def trigger_sos(
    data: TriggerSosRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    session = await service.trigger_sos(user, data)
    return _session_to_response(session, db)


# ------------------------------------------------------------------
# UPDATE LIVE LOCATION (app calls every 5–10 s while SOS is active)
# ------------------------------------------------------------------

@router.patch(
    "/session/{session_id}/location",
    response_model=SosSessionResponse,
    summary="Push current GPS coordinates to the active SOS session",
)
def update_location(
    session_id: uuid.UUID,
    data: UpdateSosLocationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    session = service.update_location(user, session_id, data)
    return _session_to_response(session, db)


# ------------------------------------------------------------------
# CANCEL SOS
# ------------------------------------------------------------------

@router.patch(
    "/session/{session_id}/cancel",
    response_model=SosSessionResponse,
    summary="Cancel SOS — marks session inactive and notifies contacts",
)
async def cancel_sos(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    session = await service.cancel_sos(user, session_id)
    return _session_to_response(session, db)


# ------------------------------------------------------------------
# GET ACTIVE SESSION
# ------------------------------------------------------------------

@router.get(
    "/session/active",
    response_model=Optional[SosSessionResponse],
    summary="Get my current active SOS session, if any",
)
def get_active_session(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SosService(db)
    session = service.get_active_session(user)
    if not session:
        return None
    return _session_to_response(session, db)


# ------------------------------------------------------------------
# PUBLIC: TRACKING DATA (JSON — polled by the map page)
# ------------------------------------------------------------------

@router.get(
    "/track/{token}",
    response_model=SosTrackingData,
    summary="[Public] Live tracking data for a SOS session",
)
def get_tracking_data(
    token: str,
    db: Session = Depends(get_db),
):
    service = SosService(db)
    return service.get_tracking_data(token)


# ------------------------------------------------------------------
# PUBLIC: LIVE TRACKING MAP PAGE (HTML — sent via SMS link)
# ------------------------------------------------------------------

@router.get(
    "/track/{token}/map",
    response_class=HTMLResponse,
    summary="[Public] Live tracking map — open in any browser",
    include_in_schema=False,
)
def tracking_map(token: str):
    api_key = settings.GOOGLE_MAPS_API_KEY
    api_base = settings.API_V1_PREFIX
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AlboTax — Live SOS Tracking</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }}
    #header {{
      background: #d32f2f; color: #fff; padding: 14px 20px;
      display: flex; align-items: center; gap: 12px;
    }}
    #header .sos-icon {{ font-size: 28px; }}
    #header h1 {{ font-size: 18px; font-weight: 600; }}
    #header p  {{ font-size: 13px; opacity: .85; margin-top: 2px; }}
    #info {{
      background: #fff; padding: 14px 20px; border-bottom: 1px solid #e0e0e0;
      display: flex; flex-wrap: wrap; gap: 16px;
    }}
    .info-item {{ flex: 1; min-width: 140px; }}
    .info-item .label {{ font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: .5px; }}
    .info-item .value {{ font-size: 15px; font-weight: 600; margin-top: 2px; }}
    #status-badge {{
      display: inline-block; padding: 3px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    }}
    .badge-active   {{ background: #e8f5e9; color: #2e7d32; }}
    .badge-inactive {{ background: #fafafa; color: #757575; }}
    #map {{ width: 100%; height: calc(100vh - 145px); }}
    #loading {{ text-align: center; padding: 60px 20px; color: #888; }}
  </style>
</head>
<body>
  <div id="header">
    <div class="sos-icon">🚨</div>
    <div>
      <h1 id="person-name">Loading…</h1>
      <p>AlboTax SOS — Live Location Tracking</p>
    </div>
  </div>

  <div id="info">
    <div class="info-item">
      <div class="label">Status</div>
      <div class="value"><span id="status-badge" class="badge-active">Active</span></div>
    </div>
    <div class="info-item">
      <div class="label">Alert triggered</div>
      <div class="value" id="triggered-at">—</div>
    </div>
    <div class="info-item">
      <div class="label">Last update</div>
      <div class="value" id="last-update">—</div>
    </div>
  </div>

  <div id="map"><div id="loading">Fetching location…</div></div>

  <script>
    const TOKEN   = "{token}";
    const API_URL = "{api_base}/sos/track/" + TOKEN;
    let map, marker, infoWindow, initialized = false;

    function fmt(iso) {{
      if (!iso) return "—";
      return new Date(iso).toLocaleTimeString([], {{ hour: "2-digit", minute: "2-digit", second: "2-digit" }});
    }}

    function fmtDate(iso) {{
      if (!iso) return "—";
      return new Date(iso).toLocaleString([], {{ dateStyle: "medium", timeStyle: "short" }});
    }}

    async function fetchAndUpdate() {{
      try {{
        const res  = await fetch(API_URL);
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById("person-name").textContent = data.user_name + " — SOS Alert";
        document.getElementById("triggered-at").textContent = fmtDate(data.triggered_at);
        document.getElementById("last-update").textContent  = fmt(data.last_location_update);

        const badge = document.getElementById("status-badge");
        if (data.is_active) {{
          badge.textContent = "Active";
          badge.className   = "badge-active";
        }} else {{
          badge.textContent = "Person is safe ✓";
          badge.className   = "badge-inactive";
          document.getElementById("header").style.background = "#388e3c";
        }}

        if (data.last_latitude && data.last_longitude) {{
          const pos = {{ lat: data.last_latitude, lng: data.last_longitude }};
          if (!initialized) {{
            map    = new google.maps.Map(document.getElementById("map"), {{ zoom: 16, center: pos }});
            marker = new google.maps.Marker({{
              position: pos, map,
              icon: {{ url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }},
              title: data.user_name,
            }});
            infoWindow = new google.maps.InfoWindow({{
              content: `<b>${{data.user_name}}</b><br>Last seen: ${{fmt(data.last_location_update)}}`,
            }});
            marker.addListener("click", () => infoWindow.open(map, marker));
            initialized = true;
          }} else {{
            marker.setPosition(pos);
            map.panTo(pos);
            infoWindow.setContent(`<b>${{data.user_name}}</b><br>Last seen: ${{fmt(data.last_location_update)}}`);
          }}
          document.getElementById("loading").style.display = "none";
        }}
      }} catch (e) {{
        console.warn("Tracking fetch error:", e);
      }}
    }}

    // Poll every 5 seconds
    fetchAndUpdate();
    setInterval(fetchAndUpdate, 5000);
  </script>
  <script
    src="https://maps.googleapis.com/maps/api/js?key={api_key}&callback=Function.prototype"
    async defer>
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)
