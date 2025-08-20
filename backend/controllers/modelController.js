const { exec } = require('child_process');
const path = require('path');
const {runScanUpcoming} = require('./dataController');
const {
  fetchAndStoreFixtures,
  fetchOddsForFixtures,
  fetchAndStoreLast5ForStoredFixtures
} = require('../utils/fetchData');


const {
  runOncePerDay
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
      console.log("ran model");
    });

    if (didRun) {
      console.log('🗓️ Ran scan-upcoming.');
    } else {
      await fetchOddsForFixtures();
      console.log('🗓️ scan-upcoming already executed earlier today.');
    }

    // 2) Run your two Python models
    const model1Path = path.join(__dirname, '..', 'ai_model', '1_model_run.py');
    const model2Path = path.join(__dirname, '..', 'ai_model', '2_model_run.py');

    exec(`python3 ${model1Path}`, (error1, stdout1, stderr1) => {
      if (error1) {
        console.error('❌ Model 1 Error:', stderr1);
        return res.status(500).json({
          error: `Model 1 Failed: ${stderr1}`,
          scan_upcoming_ran_today: didRun,
        });
      }

      console.log('✅ Model 1 Completed');

      exec(`python3 ${model2Path}`, (error2, stdout2, stderr2) => {
        if (error2) {
          console.error('❌ Model 2 Error:', stderr2);
          return res.status(500).json({
            error: `Model 2 Failed: ${stderr2}`,
            scan_upcoming_ran_today: didRun,
          });
        }

        console.log('✅ Model 2 Completed');

        return res.status(200).json({
          message: '✅ All Models Executed Successfully',
          scan_upcoming_ran_today: didRun,
          output_model_1: stdout1,
          output_model_2: stdout2,
        });
      });
    });
  } catch (err) {
    console.error('❌ runModel fatal:', err);
    return res.status(500).json({ error: 'runModel failed' });
  }
};