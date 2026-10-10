package com.example.racehorse_transport.service.impl;

import com.example.racehorse_transport.entity.TripDocument;

import com.example.racehorse_transport.repository.TripDocumentRepository;
import com.example.racehorse_transport.service.TripDocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TripDocumentServiceImpl implements TripDocumentService {

    private final TripDocumentRepository tripDocumentRepository;

    @Autowired
    public TripDocumentServiceImpl(TripDocumentRepository tripDocumentRepository) {
        this.tripDocumentRepository = tripDocumentRepository;
    }

    @Override
    public List<TripDocument> findAll() {
        return tripDocumentRepository.findAll();
    }

    @Override
    public Optional<TripDocument> findById(Integer id) {
        return tripDocumentRepository.findById(id);
    }

    @Override
    public TripDocument save(TripDocument entity) {
        return tripDocumentRepository.save(entity);
    }

    @Override
    public void deleteById(Integer id) {
        tripDocumentRepository.deleteById(id);
    }

    // =========================================================================
    // PHẦN VIỆC CỦA DEV 4: Vận hành chuyến đi (Flow 4)
    // =========================================================================
    // TODO (Dev 4): Tài xế nhận ngựa, tick danh sách giấy tờ.
    // - Viết hàm verifyTripDocuments(Integer routeId, List<Integer> documentIds)

}
