import requests
import json

BASE_URL = 'http://127.0.0.1:8000/api/'
USERNAME = 'admin'
PASSWORD = 'admin'

def run_test():
    session = requests.Session()
    
    # 1. Login
    print("Testing Login...")
    login_resp = session.post(f'{BASE_URL}token/', data={'username': USERNAME, 'password': PASSWORD})
    if login_resp.status_code != 200:
        print("Login failed:", login_resp.text)
        return
    
    tokens = login_resp.json()
    access_token = tokens['access']
    headers = {'Authorization': f'Bearer {access_token}'}
    print("Login successful.")

    # 2. Extract Batch ID (Create one if needed)
    print("Fetching Batches...")
    batches_resp = session.get(f'{BASE_URL}batches/', headers=headers)
    if batches_resp.status_code != 200:
        print("Failed to get batches:", batches_resp.text)
        return
    
    batches = batches_resp.json()
    if not batches:
        print("No batches found, creating one...")
        batch_resp = session.post(f'{BASE_URL}batches/', headers=headers, json={'name': 'Test Batch', 'year': 2024})
        if batch_resp.status_code != 201:
            print("Failed to create batch:", batch_resp.text)
            return
        batch_id = batch_resp.json()['id']
    else:
        batch_id = batches[0]['id']
    print(f"Using Batch ID: {batch_id}")

    # 3. Create Student
    print("Creating Test Student...")
    student_data = {
        'name': 'Delete Test Student',
        'roll_number': 'DEL123',
        'batch': batch_id
    }
    create_resp = session.post(f'{BASE_URL}students/', headers=headers, json=student_data)
    if create_resp.status_code != 201:
        # Check if already exists from previous failed run
        if 'already exists' in create_resp.text:
             # Try to find it
             all_stu = session.get(f'{BASE_URL}students/', headers=headers).json()
             target = next((s for s in all_stu if s['roll_number'] == 'DEL123'), None)
             if target:
                 student_id = target['id']
                 print(f"Student already exists with ID: {student_id}")
             else:
                 print("Failed to create student:", create_resp.text)
                 return
        else:
            print("Failed to create student:", create_resp.text)
            return
    else:
        student_id = create_resp.json()['id']
        print(f"Student created with ID: {student_id}")

    # 4. Delete Student
    print(f"Deleting Student {student_id}...")
    delete_resp = session.delete(f'{BASE_URL}students/{student_id}/', headers=headers)
    
    if delete_resp.status_code == 204:
        print("✅ DELETE successful (204 No Content)")
    else:
        print(f"❌ DELETE failed with status {delete_resp.status_code}: {delete_resp.text}")

if __name__ == '__main__':
    try:
        run_test()
    except Exception as e:
        print(f"An error occurred: {e}")
