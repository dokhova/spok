# spok Tests

This repository includes a simple unittest suite to verify that all image and audio files referenced in the HTML pages exist inside the repository.

## Running the tests

Execute the following command from the repository root:

```bash
python -m unittest discover tests
```

This will search the `tests/` directory and run the HTML resource validation.

