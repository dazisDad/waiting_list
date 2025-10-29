/**
 * 데이터베이스 연결 및 SQL 작업을 위한 Connector 클래스
 */
class Connector {
  /**
   * Connector 생성자
   * @param {string} environment - 사용할 환경 (예: 'preProd', 'live')
   * @param {string} urlPrefix - PHP 파일 상대 경로 위치 (예: '../')
   */
  constructor(environment, urlPrefix = '') {
    this.environment = environment;
    this.urlPrefix = urlPrefix;
  }

  /**
   * 주어진 데이터셋 배열을 사용하여 동적으로 MySQL 데이터베이스를 업데이트하거나 삽입합니다.
   * 이 함수는 `sql_updateArr.php` 스크립트와 함께 작동하도록 설계되었습니다.
   * @param {string} dbKey - 사용할 데이터베이스 키 (예: 'eInvoice', 'pos', 'portal') (필수)
   * @param {string} tableName - 작업할 테이블의 이름입니다. (예: 'history_attendance')
   * @param {Array<object>} dataSetArr - 업데이트하거나 삽입할 데이터 객체들의 배열입니다.
   * 각 객체는 테이블의 컬럼 이름과 일치하는 키를 포함해야 합니다.
   * @param {Array<string>} [whereSet] - 레코드 존재 여부를 판단할 컬럼들 (선택적)
   * - 제공되면: 기존 레코드 찾아서 있으면 UPDATE, 없으면 INSERT
   * - 제공되지 않으면: 바로 INSERT만 실행
   * @returns {Promise<object>} 작업의 성공 여부와 결과를 포함하는 JSON 응답을 반환합니다.
   */
  async updateDataArr(dbKey, tableName, dataSetArr, whereSet) {
    // dbKey 필수 체크
    if (!dbKey) {
      console.error('Error: dbKey is required for updateDataArr function. Please provide one of: "eInvoice", "pos", "portal"');
      return { success: false, error: 'dbKey parameter is required' };
    }

    // whereSet이 없으면 빈 배열로 설정 (바로 INSERT 모드)
    if (!whereSet || !Array.isArray(whereSet)) {
      whereSet = [];
    }
    let toSendObj = {
      connect_to: this.environment,
      tableName_key: tableName,
      dataSet: dataSetArr,
      whereSet: whereSet,
      db_key: dbKey
    };
    let stringfied = JSON.stringify(toSendObj);

    try {
      const response = await fetch(this.urlPrefix + "sql/sql_updateArr.php", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json' // JSON 형식으로 데이터 전송
        },
        body: JSON.stringify({ data: stringfied }) // 데이터 본문 설정
      });
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.log('Error:', error);
    }
  }

  /**
  * 테이블에서 조건(whereData)에 맞는 데이터를 SELECT 합니다.
  * 이 함수는 SQL 인젝션 방지를 위해 Prepared Statements를 사용하도록 설계되었습니다.
  * @param {string} dbKey - 사용할 데이터베이스 키 (예: 'eInvoice', 'pos', 'portal') (필수)
  * @param {string} tableName - 조회할 테이블 이름
  * @param {object} whereData - WHERE 조건에 대한 구조화된 데이터
  * - template: string (예: "email = ? AND date > ?")
  * - values: Array<string|number> (예: ["user@example.com", "2023-01-01"])
  * - types: string (예: "ss" - values의 타입 문자열)
  * @returns {Promise<object|undefined>} - 서버 응답 데이터 또는 오류 시 undefined
  */
  async selectWhere(dbKey, tableName, whereData) {
    // dbKey 필수 체크
    if (!dbKey) {
      console.error('Error: dbKey is required for selectWhere function. Please provide one of: "eInvoice", "pos", "portal"');
      return { success: false, error: 'dbKey parameter is required' };
    }
    // PHP에서 기대하는 구조로 데이터 객체 생성
    let toSendObj = {
      connect_to: this.environment,
      tableName: tableName,
      whereData: whereData, // 구조화된 whereData 객체 전송
      db_key: dbKey
    };
    let stringfied = JSON.stringify(toSendObj);

    try {
      const response = await fetch(this.urlPrefix + "sql/sql_selectWhere.php", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json' // JSON 형식으로 데이터 전송
        },
        body: JSON.stringify({ data: stringfied }) // 데이터 본문 설정
      });

      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }

      const data = await response.json();

      if (data.success === false) {
        console.error('SQL Error from Server:', data.error);
      }

      return data;
    } catch (error) {
      console.error('Fetch Error:', error);
      return { success: false, error: error.message };
    }
  }

}