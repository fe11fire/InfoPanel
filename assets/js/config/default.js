class Default {
    static backend = {
        server_ip: "127.0.0.1",
        server_port: 8084,
    }

    static paths = {
        path_video: "content/video",
        path_present: "content/present",
        path_birthday: "content/birthday",
        file_birthday: "birthday.txt",
        path_holiday: "content/holiday",
        file_holiday: "holiday.txt",
        path_text: "content/text",
        path_images: "content/imgs",
    }

    static backend_url = 'http://' + Default.backend.server_ip + ':' + Default.backend.server_port + '/';

    //Все таймеры в милисекундах 3600000 - час, 72000000 - полдня
    static system = {
        matrix_enable: false, // Включение заставки Матрицы при смене экрана
        matrix_duration: 2000, // Длительность заставки Матрицы при переходе
        start_timeOut: 3000, //пауза перед показом контента, лучше чтобы была, так как идет асинхронная подгрузка очереди в процедурном стиле кода
        side_changing: false,
        side_changing_interval: 15000, // интервал смены сторон
        config_update_interval: 20000,
        jobs_restart_timeOut: 10000,
        header_text: '',
        content_video_volume: 0.5, //content video volume form 0 to 1
        content_present_interval: 10000,
        content_img_interval: 10000,
        content_text_interval: 10000,
        content_birthdays_interval: 10000,
        content_birthdays_next_count: 5,
        content_birthdays_prev_count: 2,
        content_birthdays_max_font_size: 24, // пиксели
        info_line_changing_interval: 15000,
    };

    static css = {
        cursor: 'default',
        background_color: '#08184f',
        padding_top: '20px',
        padding_bottom: '20px',
        padding_left: '50px',
        padding_right: '50px',
        header_height: '80px',
        header_font_size: '26px',
        header_color: '#fff',
        info_line_background_color: 'linear-gradient(#08184f, #9198e5)',
        info_line_height: '40px',
        logo_width: '100px',
        calendar_color: '#fff',
        calendar_day_font_size: '75px',
        calendar_text_font_size: '20px',
        clock_color: '#fff',
        clock_size: '50px',
        birthday_name_font_size: "30px",
        birthday_text_font_size: "24px",
        birthday_color: "#fff",
    }
}