# Workshop slicer runner

1. Install Python 3 (python.org, tick "Add to PATH").
2. In Elegoo Slicer, export your Centauri Carbon 2 printer, process and filament presets as .json files (File > Export > Export preset bundle / configs) into `C:\BenchstockSlicer\profiles`.
3. Copy this folder to `C:\BenchstockSlicer`, rename `config.example.json` to `config.json`, and fill in the slicer path, profile paths and the slicer token.
4. Run `python runner.py`. Leave the window open; new quotes get sliced automatically.
5. Optional: add a Windows Task Scheduler task "At log on" running `python C:\BenchstockSlicer\runner.py`.
