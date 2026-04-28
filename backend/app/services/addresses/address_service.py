"""
Address service for saved addresses business logic.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.address import SavedAddress, AddressType
from app.models.user import User
from app.services.addresses.schema import CreateAddressRequest, UpdateAddressRequest


class AddressService:
    def __init__(self, db: Session):
        self.db = db

    def create_address(self, user_id: uuid.UUID, data: CreateAddressRequest) -> SavedAddress:
        """Create a new saved address for a user."""
        
        # If setting as default, unset any existing default address
        if data.is_default:
            self._unset_default_address(user_id)
        
        # Create the address
        address = SavedAddress(
            user_id=user_id,
            name=data.name,
            address_type=data.address_type,
            display_name=data.display_name,
            latitude=data.latitude,
            longitude=data.longitude,
            street=data.street,
            city=data.city,
            state=data.state,
            country=data.country,
            postal_code=data.postal_code,
            is_default=data.is_default,
            notes=data.notes,
        )
        
        self.db.add(address)
        self.db.commit()
        self.db.refresh(address)
        
        return address

    def get_address(self, user_id: uuid.UUID, address_id: uuid.UUID) -> SavedAddress:
        """Get a specific address by ID, ensuring user ownership."""
        address = self.db.query(SavedAddress).filter(
            SavedAddress.id == address_id,
            SavedAddress.user_id == user_id
        ).first()
        
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found or you don't have permission to access it"
            )
        
        return address

    def list_addresses(
        self, 
        user_id: uuid.UUID, 
        address_type: Optional[AddressType] = None,
        limit: int = 20, 
        offset: int = 0
    ) -> List[SavedAddress]:
        """List all addresses for a user, optionally filtered by type."""
        query = self.db.query(SavedAddress).filter(SavedAddress.user_id == user_id)
        
        if address_type:
            query = query.filter(SavedAddress.address_type == address_type)
        
        # Order by: default first, then last used, then created date
        query = query.order_by(
            SavedAddress.is_default.desc(),
            SavedAddress.last_used_at.desc().nulls_last(),
            SavedAddress.created_at.desc()
        )
        
        addresses = query.offset(offset).limit(limit).all()
        return addresses

    def update_address(
        self, 
        user_id: uuid.UUID, 
        address_id: uuid.UUID, 
        data: UpdateAddressRequest
    ) -> SavedAddress:
        """Update an existing address."""
        address = self.get_address(user_id, address_id)
        
        # If setting as default, unset any existing default address
        if data.is_default is True:
            self._unset_default_address(user_id, exclude_address_id=address_id)
        
        # Update fields if provided
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if value is not None:
                setattr(address, field, value)
        
        address.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(address)
        
        return address

    def delete_address(self, user_id: uuid.UUID, address_id: uuid.UUID) -> None:
        """Delete an address."""
        address = self.get_address(user_id, address_id)
        
        self.db.delete(address)
        self.db.commit()

    def set_default_address(self, user_id: uuid.UUID, address_id: uuid.UUID) -> SavedAddress:
        """Set an address as the user's default address."""
        address = self.get_address(user_id, address_id)
        
        # Unset any existing default address
        self._unset_default_address(user_id, exclude_address_id=address_id)
        
        # Set this address as default
        address.is_default = True
        address.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(address)
        
        return address

    def get_default_address(self, user_id: uuid.UUID) -> Optional[SavedAddress]:
        """Get the user's default address, if any."""
        return self.db.query(SavedAddress).filter(
            SavedAddress.user_id == user_id,
            SavedAddress.is_default == True
        ).first()

    def mark_address_used(self, user_id: uuid.UUID, address_id: uuid.UUID) -> SavedAddress:
        """Update the last_used_at timestamp for an address."""
        address = self.get_address(user_id, address_id)
        
        address.last_used_at = datetime.utcnow()
        address.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(address)
        
        return address

    def get_address_count(self, user_id: uuid.UUID, address_type: Optional[AddressType] = None) -> int:
        """Get the total count of addresses for a user."""
        query = self.db.query(SavedAddress).filter(SavedAddress.user_id == user_id)
        
        if address_type:
            query = query.filter(SavedAddress.address_type == address_type)
        
        return query.count()

    def _unset_default_address(self, user_id: uuid.UUID, exclude_address_id: Optional[uuid.UUID] = None):
        """Unset any existing default address for a user."""
        query = self.db.query(SavedAddress).filter(
            SavedAddress.user_id == user_id,
            SavedAddress.is_default == True
        )
        
        if exclude_address_id:
            query = query.filter(SavedAddress.id != exclude_address_id)
        
        default_addresses = query.all()
        
        for address in default_addresses:
            address.is_default = False
            address.updated_at = datetime.utcnow()
        
        if default_addresses:
            self.db.commit()