"""
Centralized Firebase Service
Singleton pattern to ensure only one Firebase initialization
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os


class FirebaseService:
    """Singleton class for Firebase operations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not FirebaseService._initialized:
            self._initialize()
            FirebaseService._initialized = True
    
    def _initialize(self):
        """Initialize Firebase app if not already initialized"""
        if not firebase_admin._apps:
            # Use absolute path for service account
            base_dir = os.path.dirname(os.path.abspath(__file__))
            service_account_path = os.path.join(base_dir, 'firebase_service_account.json')
            
            if not os.path.exists(service_account_path):
                raise FileNotFoundError(
                    f"Firebase service account file not found at {service_account_path}"
                )
            
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized successfully")
        else:
            print("ℹ️ Firebase already initialized")
        
        self.db = firestore.client()
    
    def get_db(self):
        """Get Firestore database client"""
        return self.db
    
    def get_all_users(self):
        """Get all users from Firestore"""
        users_ref = self.db.collection('users')
        users = []
        for doc in users_ref.stream():
            data = doc.to_dict()
            users.append({
                'uid': doc.id,
                'email': data.get('email', ''),
                'name': data.get('name', doc.id)
            })
        return users
    
    def get_user_positions(self, uid):
        """Get all positions/transactions for a user"""
        positions = []
        tx_ref = self.db.collection('users').document(uid).collection('transactions')
        for doc in tx_ref.stream():
            data = doc.to_dict()
            positions.append({
                'ticker': data.get('ticker'),
                'quantity': float(data.get('quantity', 0)),
                'purchasePrice': float(data.get('purchasePrice', 0)),
                'purchaseDate': data.get('purchaseDate', '')
            })
        return positions
    
    def get_available_cash(self, uid):
        """Get available cash for a user"""
        settings_ref = self.db.collection('users').document(uid).collection('settings').document('availableCash')
        doc = settings_ref.get()
        if doc.exists:
            return float(doc.to_dict().get('amount', 0))
        return 0


# Create singleton instance
firebase_service = FirebaseService()
