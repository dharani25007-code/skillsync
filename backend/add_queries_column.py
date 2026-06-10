from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    print("Checking job_applications table columns...")
    try:
        # Check if queries column exists
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='job_applications' AND column_name='queries'"))
        row = res.fetchone()
        if not row:
            print("Column 'queries' does not exist. Adding it...")
            conn.execute(text("ALTER TABLE job_applications ADD COLUMN queries JSONB DEFAULT '[]'::jsonb"))
            conn.commit()
            print("Column 'queries' added successfully.")
        else:
            print("Column 'queries' already exists.")
    except Exception as e:
        print(f"Error checking/adding column: {e}")
