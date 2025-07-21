const { exec } = require('child_process');
const path = require('path');

exports.runModel = (req, res) => {
    const model1Path = path.join(__dirname, '..', 'ai_model', '1_model_run.py');
    const model2Path = path.join(__dirname, '..', 'ai_model', '2_model_run.py');

    exec(`python3 ${model1Path}`, (error1, stdout1, stderr1) => {
        if (error1) {
            console.error('❌ Model 1 Error:', stderr1);
            return res.status(500).json({ error: `Model 1 Failed: ${stderr1}` });
        }

        console.log('✅ Model 1 Completed');

        exec(`python3 ${model2Path}`, (error2, stdout2, stderr2) => {
            if (error2) {
                console.error('❌ Model 2 Error:', stderr2);
                return res.status(500).json({ error: `Model 2 Failed: ${stderr2}` });
            }

            console.log('✅ Model 2 Completed');

            return res.status(200).json({
                message: '✅ All Models Executed Successfully',
                output_model_1: stdout1,
                output_model_2: stdout2
            });
        });
    });
};