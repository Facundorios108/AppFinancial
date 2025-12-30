
import firebase_admin
from firebase_admin import credentials, firestore
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, 'firebase_service_account.json')

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
db = firestore.client()

def test_connection():
    users_ref = db.collection('users')
    users = list(users_ref.stream())
    print(f"Usuarios encontrados: {len(users)}")
    for doc in users:
        data = doc.to_dict()
        print(f"- {doc.id}: {data.get('email', 'sin email')}")

if __name__ == '__main__':
    test_connection()
