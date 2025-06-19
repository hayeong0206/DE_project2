import React from 'react';

function WarningModal({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ 위험 경고</h2>
        <p className="text-lg text-gray-700 mb-6">
          위험도가 <span className="font-semibold text-red-500">80%</span>를 초과했습니다.
          <br />
          다른 길로 <span className="font-bold">우회</span>하세요!
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export default WarningModal;
