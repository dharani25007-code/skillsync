import gradio as gr
import json
import pandas as pd
import tempfile
import os
import csv
from rank import score_candidate, generate_plain_reasoning

def process_candidates(file_obj):
    if file_obj is None:
        return None, None, "❌ Please upload a candidates.jsonl file."
    
    # Read candidate lines
    try:
        with open(file_obj.name, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        return None, None, f"❌ Error reading file: {str(e)}"
        
    total_candidates = 0
    honeypots_detected = 0
    filtered_disqualified = 0
    candidates_scored = []
    
    for line in lines:
        if not line.strip():
            continue
        try:
            total_candidates += 1
            c = json.loads(line)
            
            # Normalize skills list (handles both list of dicts and list of strings)
            raw_skills = c.get("skills", []) or []
            skills = []
            for s in raw_skills:
                if isinstance(s, dict):
                    skills.append(s)
                elif isinstance(s, str):
                    skills.append({
                        "name": s,
                        "proficiency": "advanced",
                        "duration_months": 24,
                        "endorsements": 10
                    })
            
            # Check for honeypot signature explicitly for reporting
            if any(s.get("duration_months") == 0 for s in skills):
                honeypots_detected += 1
                continue
            
            # Run main scoring engine
            score = score_candidate(c)
            if score is None or score <= 0.0:
                filtered_disqualified += 1
                continue
            
            candidates_scored.append({
                "candidate_id": c.get("candidate_id"),
                "score": score,
                "raw": c
            })
        except Exception as e:
            continue
            
    # Sort by score desc, then candidate_id asc
    candidates_scored.sort(key=lambda x: (-x["score"], x["candidate_id"]))
    top_100 = candidates_scored[:100]
    
    # Output DataFrame
    output_rows = []
    for idx, item in enumerate(top_100, 1):
        reasoning = generate_plain_reasoning(item["raw"], idx)
        output_rows.append({
            "Rank": idx,
            "Candidate ID": item["candidate_id"],
            "Score": f"{item['score']:.4f}",
            "Reasoning": reasoning
        })
        
    df = pd.DataFrame(output_rows)
    
    # Write to a temporary CSV for download
    temp_dir = tempfile.gettempdir()
    csv_path = os.path.join(temp_dir, "submission.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f_out:
        writer = csv.DictWriter(f_out, fieldnames=["candidate_id", "rank", "score", "reasoning"])
        writer.writeheader()
        for row in output_rows:
            writer.writerow({
                "candidate_id": row["Candidate ID"],
                "rank": row["Rank"],
                "score": row["Score"],
                "reasoning": row["Reasoning"]
            })
            
    summary_text = (
        f"### 🎉 Scoring Summary:\n"
        f"• **Total Candidates Processed**: {total_candidates:,}\n"
        f"• **Honeypot Profiles Blocked (0-Month Skill)**: {honeypots_detected}\n"
        f"• **Filtered/Disqualified Candidates**: {filtered_disqualified}\n"
        f"• **Eligible Scored Candidates**: {len(candidates_scored)}\n"
    )
    
    return df, csv_path, summary_text

# Custom CSS for dark glassmorphism aesthetic
theme_css = """
body {
    background-color: #0b0f19;
}
.gradio-container {
    font-family: 'Inter', sans-serif;
}
"""

with gr.Blocks(theme=gr.themes.Soft(), css=theme_css) as demo:
    gr.Markdown("# 🧠 SkillSync AI - Candidate Ranker & Scorer")
    gr.Markdown(
        "Upload a candidate profiles dataset (`.jsonl` format) to evaluate candidates against the **Senior AI Engineer — Founding Team** role. "
        "The algorithm uses a 5-Signal scoring model (Career, Skills Depth, Experience, Behavioral, and Education) and automatically filters out honeypot profiles."
    )
    
    with gr.Row():
        with gr.Column(scale=1):
            file_input = gr.File(label="Upload candidates.jsonl file", file_types=[".jsonl"])
            run_btn = gr.Button("🚀 Run 5-Signal Scorer", variant="primary")
            
        with gr.Column(scale=2):
            summary_output = gr.Markdown("### Results summary will appear here...")
            csv_output = gr.File(label="Download Generated submission.csv")
            
    with gr.Row():
        table_output = gr.Dataframe(
            headers=["Rank", "Candidate ID", "Score", "Reasoning"],
            datatype=["number", "str", "str", "str"],
            label="🏆 Top 100 Ranked Candidates"
        )
        
    run_btn.click(
        fn=process_candidates,
        inputs=[file_input],
        outputs=[table_output, csv_output, summary_output]
    )
    
    gr.Markdown("---")
    gr.Markdown("**Designed & Developed by Dharani Dharan M** | 5-Signal Model for Redrob Hackathon Track 1")

if __name__ == "__main__":
    demo.launch()
