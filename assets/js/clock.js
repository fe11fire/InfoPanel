const deg = 6; //360deg / 60(min||sec) => 6
const hr = document.querySelector("#hr");
const mn = document.querySelector("#mn");
const sc = document.querySelector("#sc");
moment.locale('ru');

function updateClock() {
    let day = new Date();
    let hh = day.getHours() * 30; //360deg / 12 hour => 30
    let mm = day.getMinutes() * deg;
    let ss = day.getSeconds() * deg;

    hr.style.transform = `rotateZ(${hh + mm / 12}deg)`;
    mn.style.transform = `rotateZ(${mm}deg)`;
    sc.style.transform = `rotateZ(${ss}deg)`;

    let d = moment().format('d');
    $('.p_calendar_day').html(moment().format('D'));
    $('.p_calendar_month').html(moment().format('D MMMM').split(' ')[1]);
    $('.p_calendar_weekday').html(moment().format('dddd'));
    if ((d == 0) || (d == 6)) {
        $('.div_calendar_day').addClass('text-danger');
    } else {
        $('.div_calendar_day').removeClass('text-danger');
    }

    if (day.getSeconds() % 2 == 0) {
        $('.digitclock p').html(moment().format('kk') + '<span class="digitclock_colon text-center">:</span>' + moment().format('mm'));
    } else {
        $('.digitclock p').html(moment().format('kk') + '<span class="digitclock_colon"></span>' + moment().format('mm'));
    }

    fitSidebarText();

    // $('#dayDate').html('<b>' + moment().format('D  YYYY г.') + '<br>' + moment().format('HH:mm:ss') + '</b>');
}

// Боковая колонка узкая (col-2), и месяц/день недели/часы могут не влезать по
// ширине - особенно длинные названия ("воскресенье", "сентября"). config еще не
// создан на самом первом тике (clock.js подключается раньше инлайн-скрипта,
// который его создает), поэтому до готовности конфига просто пропускаем подбор.
function fitSidebarText() {
    if (typeof config === 'undefined' || !config) {
        return;
    }

    Library.fitFontSize(
        [document.querySelector('.p_calendar_month'), document.querySelector('.p_calendar_weekday')],
        parseInt(config.getByName('calendar_text_font_size'), 10)
    );

    let clockEl = document.querySelector('#div_clock p');
    Library.fitFontSize([clockEl], parseInt(config.getByName('clock_size'), 10));
    if (clockEl && clockEl.offsetParent !== null) {
        document.documentElement.style.setProperty('--clock_size', clockEl.style.fontSize);
    }
}

updateClock();
setInterval(updateClock, 1000);