# 按數字鍵選擇動作，並且標準有perfect
import cv2
import mediapipe as mp
import numpy as np

def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0: angle = 360 - angle
    return int(angle)

# ==========================================
# 擴充資料庫：加入深蹲 (Squat)
# ==========================================
YOGA_DATABASE = {
    "Warrior_1": [
        {"name": "L_Arm", "joints": (11, 13, 15), "min": 150, "max": 180, "msg_low": "Straighten left arm!", "msg_high": "", "msg_correct": "L_Arm: PERFECT"},
        {"name": "R_Arm", "joints": (12, 14, 16), "min": 150, "max": 180, "msg_low": "Straighten right arm!", "msg_high": "", "msg_correct": "R_Arm: PERFECT"},
        {"name": "L_Knee", "joints": (23, 25, 27), "min": 70, "max": 110, "msg_low": "Rise up a bit!", "msg_high": "Bend front knee more!", "msg_correct": "L_Knee: PERFECT"},
        {"name": "R_Knee", "joints": (24, 26, 28), "min": 150, "max": 180, "msg_low": "Straighten back leg!", "msg_high": "", "msg_correct": "R_Knee: PERFECT"}
    ],
    "Squat": [
        # 深蹲主要看雙膝角度 (假設 70~100度為合格深蹲)
        {"name": "L_Knee", "joints": (23, 25, 27), "min": 70, "max": 100, "msg_low": "Squat lower!", "msg_high": "Stand up a bit!", "msg_correct": "L_Knee: PERFECT"},
        {"name": "R_Knee", "joints": (24, 26, 28), "min": 70, "max": 100, "msg_low": "Squat lower!", "msg_high": "Stand up a bit!", "msg_correct": "R_Knee: PERFECT"}
    ]
}

def evaluate_pose(landmarks, pose_name):
    rules = YOGA_DATABASE.get(pose_name, [])
    feedbacks = []
    for rule in rules:
        p1, p2, p3 = rule["joints"]
        a, b, c = [landmarks[p1].x, landmarks[p1].y], [landmarks[p2].x, landmarks[p2].y], [landmarks[p3].x, landmarks[p3].y]
        current_angle = calculate_angle(a, b, c)
        
        if current_angle < rule["min"] and rule["msg_low"] != "":
            feedbacks.append(f"{rule['name']}: {rule['msg_low']}")
        elif current_angle > rule["max"] and rule["msg_high"] != "":
            feedbacks.append(f"{rule['name']}: {rule['msg_high']}")
        elif rule.get("msg_correct", "") != "":
            feedbacks.append((rule["msg_correct"], (0, 255, 0)))
    return feedbacks

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
cap = cv2.VideoCapture(0)

# 預設動作
CURRENT_MODE = "Warrior_1"  

# 提高相機解析度 (設定為 1280x720)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while cap.isOpened():
        success, image = cap.read()
        if not success: break
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        
        # 顯示目前模式與操作說明
        cv2.putText(image, f"Mode: {CURRENT_MODE}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2, cv2.LINE_AA)
        cv2.putText(image, "Press '1': Warrior_1 | '2': Squat | 'q': Quit", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            try:
                errors = evaluate_pose(landmarks, CURRENT_MODE)
                if len(errors) == 0:
                    cv2.putText(image, "PERFECT!", (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3, cv2.LINE_AA)
                else:
                    y_offset = 110
                    for error_text in errors:
                        cv2.putText(image, error_text, (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
                        y_offset += 35
            except:
                pass
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
        cv2.imshow('Yoga AI Tracker', image)
        
        # ==========================================
        # 鍵盤監聽邏輯：動態改變 CURRENT_MODE
        # ==========================================
        key = cv2.waitKey(5) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('1'):
            CURRENT_MODE = "Warrior_1" # 按下 1 切換到戰士一式
        elif key == ord('2'):
            CURRENT_MODE = "Squat"     # 按下 2 切換到深蹲

cap.release()
cv2.destroyAllWindows()
