const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execFileAsync = promisify(execFile);

const { runScanUpcoming } = require('./dataController');
const {
  fetchOddsForFixtures,
  runOncePerDay,
} = require('../utils/fetchData');

exports.runModel = async (req, res) => {
  try {
    // 1) Scan upcoming ONCE per UTC day (first login that hits this endpoint)
    const didRun = await runOncePerDay('scan-upcoming', async () => {
      await runScanUpcoming({
        source: 'api',   // pull from API on the first run
        withOdds: true,
        withForm: true,
      });
      console.log('ran model');
    });

    if (didRun) {
      console.log('🗓️ Ran scan-upcoming.');
    } else {
      await fetchOddsForFixtures();
      console.log('🗓️ scan-upcoming already executed earlier today.');
    }

    // 2) Run your two Python models SEQUENTIALLY and AWAIT them
    const model1Path = path.join(__dirname, '..', 'ai_model', '1_model_run.py');
    const model2Path = path.join(__dirname, '..', 'ai_model', '2_model_run.py');

    // Options: bump buffer to avoid "maxBuffer exceeded" if your scripts print a lot
    const execOpts = {
      maxBuffer: 10 * 1024 * 1024, // 10MB
      // cwd: path.join(__dirname, '..', 'ai_model'), // optional, if scripts rely on cwd
      // env: { ...process.env }, // optional, if you need env tweaks
    };

    // Prefer execFile with "python3" and args for safety
    const { stdout: m1out, stderr: m1err } = await execFileAsync('python3', [model1Path], execOpts);
    if (m1err && m1err.trim()) {
      //console.warn('Model 1 stderr:', m1err);
    }
    console.log('✅ Model 1 Completed');

    const { stdout: m2out, stderr: m2err } = await execFileAsync('python3', [model2Path], execOpts);
    if (m2err && m2err.trim()) {
      //console.warn('Model 2 stderr:', m2err);
    }
    console.log('✅ Model 2 Completed');

    return res.status(200).json({
      message: '✅ All Models Executed Successfully',
      scan_upcoming_ran_today: didRun,
      output_model_1: m1out,
      output_model_2: m2out,
      warnings: {
        model1_stderr: m1err?.trim() || null,
        model2_stderr: m2err?.trim() || null,
      },
    });
  } catch (err) {
    console.error('❌ runModel fatal:', err);
    return res.status(500).json({
      error: 'runModel failed',
      details: err?.message || String(err),
    });
  }
};
