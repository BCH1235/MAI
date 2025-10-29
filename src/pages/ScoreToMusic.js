// musicgen-app-main/src/pages/ScoreToMusic.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMusicContext } from '../context/MusicContext';
import {
    Typography,
    Button,
    CircularProgress,
    Box,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const ScoreToMusic = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [format, setFormat] = useState('midi'); // 변환 형식 상태
    const navigate = useNavigate();
    
    const { actions } = useMusicContext();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "application/pdf") {
            setPdfFile(file);
            setFileName(file.name);
        } else {
            alert("PDF 파일만 업로드할 수 있습니다.");
            setPdfFile(null);
            setFileName('');
        }
    };

    const handleFormatChange = (event) => {
        setFormat(event.target.value);
    };

    // 작업 상태 폴링
    const pollTaskStatus = async (taskId) => {
        const maxAttempts = 60;
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`http://127.0.0.1:5000/api/music/task/status?taskId=${taskId}`);
                if (!response.ok) throw new Error('작업 상태 확인 실패');

                const statusData = await response.json();
                console.log('작업 상태:', statusData);
                
                if (statusData.status === 'succeeded') {
                    const musicData = {
                        id: statusData.result?.id || `score_${Date.now()}`,
                        title: statusData.result?.title || `악보 기반 생성 음악`,
                        audioUrl: statusData.audioUrl || statusData.result?.audioUrl,
                        genres: statusData.result?.genres || ['Classical'],
                        moods: statusData.result?.moods || [],
                        duration: statusData.result?.duration || 180,
                        createdAt: statusData.result?.createdAt || new Date().toISOString(),
                        type: 'score-generated',
                        originalFile: fileName,
                        targetGenre: 'Classical',
                        format: format
                    };

                    console.log('생성된 musicData:', musicData);

                    if (actions.setResult) actions.setResult({ convertedMusic: musicData });
                    localStorage.setItem('scoreGeneratedMusic', JSON.stringify(musicData));

                    return true;
                } else if (statusData.status === 'failed') {
                    throw new Error(statusData.error || '음악 생성 실패');
                } else if (statusData.status === 'running' || statusData.status === 'queued') {
                    console.log(`작업 진행중... (${attempts + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    attempts++;
                } else {
                    throw new Error(`알 수 없는 작업 상태: ${statusData.status}`);
                }
            } catch (error) {
                console.error('작업 상태 확인 중 오류:', error);
                throw error;
            }
        }
        throw new Error('작업 시간 초과 (30분)');
    };

    const handleSubmit = async () => {
    if (!pdfFile) {
        alert("악보 PDF 파일을 업로드해주세요.");
        return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('score', pdfFile);
    formData.append('format', format); // 선택된 변환 형식 전송

    try {
        console.log('=== 악보 처리 시작 ===');
        const response = await fetch('http://127.0.0.1:5000/api/process-score', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '음악 생성에 실패했습니다.');
        }

        const data = await response.json();
        console.log('서버 응답:', data);

        const taskId = data.taskId;
        if (!taskId) throw new Error('작업 ID를 받을 수 없습니다.');

        await pollTaskStatus(taskId);

        // ✅ navigate를 먼저 실행 (setIsLoading보다 우선)
        navigate('/result');

    } catch (error) {
        console.error("Error generating music from score:", error);
        alert(`음악 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        // ✅ navigate 후 1초 뒤 상태 해제 (안정성 확보)
        setTimeout(() => setIsLoading(false), 1000);
    }
};


    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100vh',
                bgcolor: '#000',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                pt: 8,
                pb: 4,
            }}
        >
            <Box
                sx={{
                    width: { xs: '90%', sm: '600px' },
                    bgcolor: '#1A1A1A',
                    borderRadius: 3,
                    p: { xs: 3, sm: 4 },
                    textAlign: 'center',
                    boxShadow: '0 0 20px rgba(80, 227, 194, 0.2)',
                    color: '#FFF'
                }}
            >
                <Typography variant="h4" gutterBottom>
                    악보 연주하기
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, color: '#CCC' }}>
                    PDF 악보 파일을 업로드하면 AI가 분석하여 음악을 연주해줍니다.
                </Typography>

                {/* 파일 업로드 영역 */}
                <Box
                    sx={{
                        border: '2px dashed #555',
                        borderRadius: '10px',
                        p: 4,
                        mb: 3,
                        cursor: 'pointer',
                        bgcolor: '#0a0a0a',
                        '&:hover': {
                            borderColor: '#50E3C2',
                            bgcolor: '#111'
                        }
                    }}
                    onClick={() => document.getElementById('pdf-upload').click()}
                >
                    <UploadFileIcon sx={{ fontSize: 60, color: '#777' }} />
                    <Typography sx={{ color: '#CCC', mt: 1 }}>
                        {fileName || '클릭하여 PDF 파일을 선택하세요'}
                    </Typography>
                    <input
                        type="file"
                        id="pdf-upload"
                        hidden
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />
                </Box>

                {/* 변환 형식 선택 */}
                <FormControl
                    fullWidth
                    sx={{ mb: 3, bgcolor: '#0a0a0a', borderRadius: 1 }}
                >
                    <InputLabel sx={{ color: '#CCC' }}>변환 형식</InputLabel>
                    <Select
                        value={format}
                        onChange={handleFormatChange}
                        sx={{
                            color: '#FFF',
                            borderColor: '#555',
                            '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#50E3C2' },
                            '& .MuiSvgIcon-root': { color: '#50E3C2' },
                        }}
                    >
                        <MenuItem value="midi">MIDI로 변환</MenuItem>
                        <MenuItem value="wav">WAV로 변환</MenuItem>
                       
                    </Select>
                </FormControl>

                {/* 변환 버튼 */}
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSubmit}
                    disabled={isLoading || !pdfFile}
                    sx={{
                        minWidth: '200px',
                        minHeight: '50px',
                        bgcolor: '#50E3C2',
                        color: '#000',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#40D9B8' },
                        '&:disabled': { bgcolor: '#333', color: '#666' }
                    }}
                >
                    {isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CircularProgress size={24} color="inherit" />
                            <span>처리 중...</span>
                        </Box>
                    ) : (
                        '변환하기'
                    )}
                </Button>

                {/* 로딩 상태 표시 */}
                {isLoading && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" sx={{ color: '#AAA', mb: 1 }}>
                            악보를 분석하고 {format.toUpperCase()} 형식으로 변환 중입니다...
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                            최대 10분이 소요될 수 있습니다.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default ScoreToMusic;
