"""
Addresses API endpoints for saved addresses functionality.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.db.engine import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.address import AddressType
from app.services.addresses.address_service import AddressService
from app.services.addresses.schema import (
    CreateAddressRequest,
    UpdateAddressRequest,
    AddressResponse,
    AddressListResponse,
    SuccessResponse,
    AddressFilterParams,
)

router = APIRouter(prefix="/addresses")


@router.get(
    "/",
    response_model=AddressListResponse,
    summary="List saved addresses",
    description="Get all saved addresses for the current user, optionally filtered by type."
)
async def list_addresses(
    address_type: Optional[AddressType] = Query(None, description="Filter by address type"),
    limit: int = Query(20, ge=1, le=100, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    
    addresses = service.list_addresses(
        user_id=user.id,
        address_type=address_type,
        limit=limit,
        offset=offset
    )
    
    total = service.get_address_count(user_id=user.id, address_type=address_type)
    
    return AddressListResponse(
        addresses=addresses,
        total=total
    )


@router.get(
    "/{address_id}",
    response_model=AddressResponse,
    summary="Get address by ID",
    description="Get a specific saved address by its ID."
)
async def get_address(
    address_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    address = service.get_address(user_id=user.id, address_id=address_id)
    return address


@router.post(
    "/",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new address",
    description="Create a new saved address for the current user."
)
async def create_address(
    data: CreateAddressRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    address = service.create_address(user_id=user.id, data=data)
    return address


@router.put(
    "/{address_id}",
    response_model=AddressResponse,
    summary="Update address",
    description="Update an existing saved address."
)
async def update_address(
    address_id: uuid.UUID,
    data: UpdateAddressRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    address = service.update_address(user_id=user.id, address_id=address_id, data=data)
    return address


@router.delete(
    "/{address_id}",
    response_model=SuccessResponse,
    summary="Delete address",
    description="Delete a saved address."
)
async def delete_address(
    address_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    service.delete_address(user_id=user.id, address_id=address_id)
    
    return SuccessResponse(
        success=True,
        message="Address deleted successfully"
    )


@router.put(
    "/{address_id}/set-default",
    response_model=AddressResponse,
    summary="Set as default address",
    description="Mark an address as the user's default address."
)
async def set_default_address(
    address_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    address = service.set_default_address(user_id=user.id, address_id=address_id)
    return address


@router.get(
    "/default",
    response_model=AddressResponse,
    summary="Get default address",
    description="Get the user's default address, if set."
)
async def get_default_address(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    address = service.get_default_address(user_id=user.id)
    
    if not address:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default address set"
        )
    
    return address


@router.put(
    "/{address_id}/use",
    response_model=AddressResponse,
    summary="Mark address as used",
    description="Update the last_used_at timestamp for an address."
)
async def mark_address_used(
    address_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    address = service.mark_address_used(user_id=user.id, address_id=address_id)
    return address


@router.get(
    "/types/{address_type}",
    response_model=AddressListResponse,
    summary="List addresses by type",
    description="Get addresses filtered by a specific type (home, work, favorite, custom)."
)
async def list_addresses_by_type(
    address_type: AddressType,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AddressService(db)
    
    addresses = service.list_addresses(
        user_id=user.id,
        address_type=address_type,
        limit=limit,
        offset=offset
    )
    
    total = service.get_address_count(user_id=user.id, address_type=address_type)
    
    return AddressListResponse(
        addresses=addresses,
        total=total
    )