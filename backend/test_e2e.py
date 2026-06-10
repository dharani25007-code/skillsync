import requests
import time
import os

API_URL = "http://127.0.0.1:8000"

def run_tests():
    print("Running E2E tests...")
    
    # 1. Create a Recruiter account
    recruiter_email = f"test_recruiter_{int(time.time())}@example.com"
    recruiter_data = {
        "name": "E2E Recruiter",
        "email": recruiter_email,
        "password": "Password123!",
        "role": "recruiter"
    }
    
    print(f"Registering recruiter with email: {recruiter_email}")
    res = requests.post(f"{API_URL}/auth/register", json=recruiter_data)
    assert res.status_code == 200, f"Failed recruiter registration: {res.text}"
    recruiter_token = res.json()["access_token"]
    print("Recruiter registered successfully.")

    # 2. Create a Job Seeker account
    seeker_email = f"test_seeker_{int(time.time())}@example.com"
    seeker_data = {
        "name": "E2E Seeker",
        "email": seeker_email,
        "password": "Password123!",
        "role": "jobseeker"
    }
    
    print(f"Registering job seeker with email: {seeker_email}")
    res = requests.post(f"{API_URL}/auth/register", json=seeker_data)
    assert res.status_code == 200, f"Failed seeker registration: {res.text}"
    seeker_token = res.json()["access_token"]
    print("Job seeker registered successfully.")

    # 3. Post a Job as Recruiter
    job_post_data = {
        "title": "E2E Python Engineer",
        "description": "Requires strong Python and SQL skills. Build robust backend services.",
        "required_skills": ["Python", "SQL"],
        "experience_min": 2,
        "experience_max": 5,
        "location": "Remote",
        "work_mode": "remote",
        "salary_min": 10.0,
        "salary_max": 20.0,
        "industry": "Software"
    }
    
    print("Posting job as recruiter...")
    headers = {"Authorization": f"Bearer {recruiter_token}"}
    res = requests.post(f"{API_URL}/jobs/post", json=job_post_data, headers=headers)
    assert res.status_code == 200, f"Failed to post job: {res.text}"
    job_id = res.json()["job_id"]
    print(f"Job posted successfully. ID: {job_id}")

    # 4. List jobs as Job Seeker (verify mock/seed jobs are gone)
    print("Listing jobs as job seeker...")
    headers_seeker = {"Authorization": f"Bearer {seeker_token}"}
    res = requests.get(f"{API_URL}/jobs/list", headers=headers_seeker)
    assert res.status_code == 200, f"Failed to list jobs: {res.text}"
    jobs_list = res.json()
    print(f"Received {len(jobs_list)} jobs.")
    
    # Check that our posted job is there
    found_our_job = False
    for job in jobs_list:
        if job["id"] == job_id:
            found_our_job = True
            print("Successfully found our posted job in job seeker list.")
        # Ensure it has no seed jobs (their recruiter_id is 0 or source is featured)
        assert job.get("recruiter_id") != 0 or job.get("source") != "featured", "Mock/Seed job found in list!"

    assert found_our_job, "Posted job not found in candidate browse list"



    # 4. Recruiter edits job
    print("Editing job as recruiter...")
    job_post_data["title"] = "E2E Senior Python Engineer"
    res = requests.put(f"{API_URL}/jobs/edit/{job_id}", json=job_post_data, headers=headers)
    assert res.status_code == 200, f"Failed to edit job: {res.text}"
    print("Job edited successfully.")

    # 5. List jobs as Job Seeker (verify edited title and mock/seed jobs are gone)
    print("Listing jobs as job seeker...")
    headers_seeker = {"Authorization": f"Bearer {seeker_token}"}
    res = requests.get(f"{API_URL}/jobs/list", headers=headers_seeker)
    assert res.status_code == 200, f"Failed to list jobs: {res.text}"
    jobs_list = res.json()
    print(f"Received {len(jobs_list)} jobs.")
    
    found_our_job = False
    for job in jobs_list:
        if job["id"] == job_id:
            found_our_job = True
            assert job["title"] == "E2E Senior Python Engineer", f"Expected edited title, found {job['title']}"
            print("Successfully found our edited job in job seeker list.")
        assert job.get("recruiter_id") != 0 or job.get("source") != "featured", "Mock/Seed job found in list!"

    assert found_our_job, "Posted job not found in candidate browse list"

    # 6. Apply to the job as Job Seeker
    print("Applying to job as job seeker...")
    cover_letter = "Hi, I am an excellent candidate for the E2E Python role because I have 3 years of Python experience."
    
    resume_content = b"PDF dummy contents for resume"
    resume_filename = "e2e_resume.pdf"
    
    files = {"file": (resume_filename, resume_content, "application/pdf")}
    data = {"cover_letter": cover_letter}
    
    res = requests.post(
        f"{API_URL}/jobs/apply/{job_id}",
        headers=headers_seeker,
        data=data,
        files=files
    )
    assert res.status_code == 200, f"Failed to apply: {res.text}"
    application_id = res.json()["application_id"]
    print(f"Applied successfully. Application ID: {application_id}")

    # 7. Raise query as seeker
    print("Raising query as seeker...")
    query_msg = "Is this role hybrid or remote?"
    res = requests.post(
        f"{API_URL}/jobs/applications/{application_id}/query",
        json={"message": query_msg},
        headers=headers_seeker
    )
    assert res.status_code == 200, f"Failed to raise query: {res.text}"
    print("Query raised successfully.")

    # 8. View Applicants as Recruiter (verify applicant has query)
    print("Viewing applicants as recruiter...")
    res = requests.get(f"{API_URL}/jobs/applicants/{job_id}", headers=headers)
    assert res.status_code == 200, f"Failed to view applicants: {res.text}"
    applicants = res.json()
    assert len(applicants) == 1, f"Expected 1 applicant, found {len(applicants)}"
    app_details = applicants[0]
    assert app_details["application_id"] == application_id
    assert app_details["cover_letter"] == cover_letter
    assert len(app_details["queries"]) == 1
    assert app_details["queries"][0]["message"] == query_msg
    print("Applicant details and query verified successfully.")

    # 9. Reply to query as recruiter
    print("Replying to query as recruiter...")
    reply_msg = "It is remote."
    res = requests.post(
        f"{API_URL}/jobs/applications/{application_id}/query",
        json={"message": reply_msg},
        headers=headers
    )
    assert res.status_code == 200, f"Failed to reply to query: {res.text}"
    
    # 10. Seeker checks my-applications to verify recruiter reply is present
    print("Checking my-applications as seeker...")
    res = requests.get(f"{API_URL}/jobs/my-applications", headers=headers_seeker)
    assert res.status_code == 200
    my_apps = res.json()
    our_app = next((a for a in my_apps if a["application_id"] == application_id), None)
    assert our_app is not None
    assert len(our_app["queries"]) == 2
    assert our_app["queries"][1]["message"] == reply_msg
    print("Recruiter reply verified successfully in seeker's applications list.")

    # 11. Download Resume as Recruiter
    print("Downloading resume as recruiter...")
    res = requests.get(f"{API_URL}/jobs/download-resume/{application_id}", headers=headers)
    assert res.status_code == 200, f"Failed to download resume: {res.text}"
    assert res.content == resume_content, "Downloaded resume content doesn't match original!"
    print("Downloaded resume content matches original perfectly.")

    # 12. Delete job as recruiter
    print("Deleting job as recruiter...")
    res = requests.delete(f"{API_URL}/jobs/delete/{job_id}", headers=headers)
    assert res.status_code == 200, f"Failed to delete job: {res.text}"
    print("Job deleted successfully.")

    # 13. Clean up created database records
    print("Cleaning up test data from database...")
    from database import SessionLocal
    from models import User, JobPost, JobSeekerProfile, RecruiterProfile, JobApplication
    
    db = SessionLocal()
    try:
        # Delete test seeker user and profile
        seeker = db.query(User).filter(User.email == seeker_email).first()
        if seeker:
            db.query(JobSeekerProfile).filter(JobSeekerProfile.user_id == seeker.id).delete()
            db.delete(seeker)
            
        # Delete test recruiter user and profile
        recruiter = db.query(User).filter(User.email == recruiter_email).first()
        if recruiter:
            db.query(RecruiterProfile).filter(RecruiterProfile.user_id == recruiter.id).delete()
            db.delete(recruiter)
            
        db.commit()
        print("Test database records cleaned up successfully.")
    except Exception as cleanup_err:
        print(f"Warning: database cleanup failed: {cleanup_err}")
    finally:
        db.close()

    print("\nAll E2E tests passed successfully!")

if __name__ == "__main__":
    run_tests()
