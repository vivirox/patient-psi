# Patient PSI Python Backend

This directory contains the Python backend for the Patient PSI project, which handles the generation of Cognitive Conceptualization Diagrams (CCD) from therapy session transcripts.

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Then edit `.env` with your actual configuration values.

## Usage

To generate a CCD from a transcript:

```bash
python generation/generate.py --transcript-file your_transcript.txt --out-file output.json
```

### Arguments:
- `--transcript-file`: Path to the transcript file (relative to DATA_PATH)
- `--out-file`: Name of the output JSON file (will be saved in OUT_PATH)

## Directory Structure

- `generation/`: Contains the core generation logic
  - `generate.py`: Main script for generating CCDs
  - `generation_template.py`: Templates and models for generation
- `data/`: Contains input data and resources
  - `cbt_resources/`: CBT-related resources
  - `example_transcript.txt`: Example transcript for testing
  - `profiles.json`: User profiles data
