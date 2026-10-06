package service.impl;

import entity.HorseHealthLog;

import repository.HorseHealthLogRepository;
import service.HorseHealthLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class HorseHealthLogServiceImpl implements HorseHealthLogService {

    private final HorseHealthLogRepository horseHealthLogRepository;

    @Autowired
    public HorseHealthLogServiceImpl(HorseHealthLogRepository horseHealthLogRepository) {
        this.horseHealthLogRepository = horseHealthLogRepository;
    }

    @Override
    public List<HorseHealthLog> findAll() {
        return horseHealthLogRepository.findAll();
    }

    @Override
    public Optional<HorseHealthLog> findById(Integer id) {
        return horseHealthLogRepository.findById(id);
    }

    @Override
    public HorseHealthLog save(HorseHealthLog entity) {
        return horseHealthLogRepository.save(entity);
    }

    @Override
    public void deleteById(Integer id) {
        horseHealthLogRepository.deleteById(id);
    }

    // =========================================================================
    // PHẦN VIỆC CỦA DEV 4: Vận hành chuyến đi & Bàn giao (Execution) - Flow 4, 6
    // =========================================================================
    
    /**
     * API: Escort (Nhân viên áp tải) cập nhật sức khỏe ngựa trên chuyến đi.
     * Người đảm nhận: Dev 4
     */
    public HorseHealthLog updateHorseHealthStatusByEscort(Integer horseId, Integer routeId, String healthStatus, String note) {
        // TODO (Dev 4):
        // 1. Kiểm tra xem user gọi API này có role là ESCORT không?
        // 2. Kiểm tra xem con ngựa này (horseId) có đang trên chuyến xe hiện tại không?
        // 3. Khởi tạo đối tượng HorseHealthLog mới.
        // 4. Gắn các thông tin: healthStatus (Bình thường, Bệnh nhẹ, Khẩn cấp, ...), note.
        // 5. Lưu vào Database thông qua horseHealthLogRepository.save()
        // 6. Nếu healthStatus là "Khẩn cấp" -> Bắn notification hoặc lưu SystemLog cảnh báo cho Manager.
        
        return null; // Thay bằng object sau khi xử lý xong
    }
}
