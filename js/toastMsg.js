/**
 * @fileoverview 이 파일은 토스트 메시지를 화면에 표시하는 함수를 제공합니다.
 * @Dependencies 없음
 * @description
 * 사용 방법:
 * 1. 이 파일을 HTML 파일에 <script src="toastMsg.js"></script> 태그로 추가합니다.
 * 2. `toastMsg('표시할 메시지')` 함수를 호출하여 메시지를 띄웁니다.
 *
 * @param {string} msg - 토스트 메시지에 표시할 내용입니다.
 */

const TOAST_BACKGROUND_COLOR = '#343A40'; // 토스트 메시지의 배경색을 이곳에서 변경하세요.

function toastMsg(msg) {
    const characterLimit = 40; // 한 줄 글자 수 제한 설정
    
    const toastContainer = document.querySelector('.toast-container');
    if (toastContainer) {
        toastContainer.remove(); // 기존 메시지가 있다면 제거
    }

    const newToastContainer = document.createElement('div');
    newToastContainer.className = 'toast-container';
    // 동적으로 컨테이너 스타일 설정
    Object.assign(newToastContainer.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '1000'
    });

    const toastMessage = document.createElement('div');
    toastMessage.className = 'toast-message';
    toastMessage.textContent = msg;
    // 동적으로 메시지 스타일 설정
    Object.assign(toastMessage.style, {
        backgroundColor: TOAST_BACKGROUND_COLOR,
        fontSize: 'smaller',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '5px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        opacity: '0',
        maxWidth: '80vw',
        width: 'fit-content'
    });

    // 글자 수에 따라 white-space 속성 동적으로 추가
    if (msg.length <= characterLimit) {
        toastMessage.style.whiteSpace = 'nowrap';
    } else {
        toastMessage.style.whiteSpace = 'normal';
    }

    newToastContainer.appendChild(toastMessage);
    document.body.appendChild(newToastContainer);

    // 페이드인 애니메이션을 위해 setTimeout 사용
    setTimeout(() => {
        Object.assign(toastMessage.style, {
            opacity: '1',
            transform: 'translateY(0)',
            transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
        });
    }, 10);

    // 5초 후에 메시지 숨기고 제거
    setTimeout(() => {
        Object.assign(toastMessage.style, {
            opacity: '0',
            transform: 'translateY(20px)',
        });

        // 페이드아웃 애니메이션이 끝난 후 컨테이너 제거
        setTimeout(() => {
            newToastContainer.remove();
        }, 500);
    }, 5000);
}